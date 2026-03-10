import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasSchoolAccess } from "@/lib/auth/school-access";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  const { schoolSlug } = await params;
  const session = await getSession();

  if (!session || !hasSchoolAccess(session, schoolSlug)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
  });

  if (!school)
    return NextResponse.json({ error: "School not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("classId");
  const searchQuery = searchParams.get("q");

  // Read Working Context from cookies
  const cookieStore = await import("next/headers").then(mod => mod.cookies());
  const workingYearId = (await cookieStore).get(`sms_working_year_${schoolSlug}`)?.value;
  const workingTermId = (await cookieStore).get(`sms_working_term_${schoolSlug}`)?.value;

  const schoolWithSettings = await prisma.school.findUnique({
    where: { id: school.id },
    select: { settings: true },
  });
  const settings = (schoolWithSettings?.settings as any) || {};

  const effectiveYearId = workingYearId || settings.currentAcademicYearId;
  const effectiveTermId = workingTermId || settings.currentTermId;

  // Find students who have unpaid bills in the target period
  const studentsWithBills = await prisma.student.findMany({
    where: {
      schoolId: school.id,
      ...(classId && { classId }),
      ...(searchQuery && {
        OR: [
          { profile: { firstName: { contains: searchQuery, mode: "insensitive" } } },
          { profile: { lastName: { contains: searchQuery, mode: "insensitive" } } },
          { studentId: { contains: searchQuery, mode: "insensitive" } },
        ],
      }),
      bills: {
        some: {
          academicYearId: effectiveYearId,
          ...(effectiveTermId && { termId: effectiveTermId }),
          status: { not: "PAID" },
        }
      }
    },
    include: {
      profile: {
        select: { firstName: true, lastName: true, phone: true },
      },
      class: {
        select: { name: true },
      },
      bills: {
        where: {
          academicYearId: effectiveYearId,
          ...(effectiveTermId && { termId: effectiveTermId }),
          status: { not: "PAID" },
        },
        select: {
          balanceAmount: true,
        }
      }
    }
  });

  // Calculate the period-specific outstanding balance for each student
  const debtors = studentsWithBills.map(student => {
    const periodBalance = student.bills.reduce((sum, bill) => sum + Number(bill.balanceAmount), 0);
    return {
      ...student,
      outstandingBalance: periodBalance,
      bills: undefined, // cleanup
    };
  }).filter(s => s.outstandingBalance > 0)
    .sort((a, b) => b.outstandingBalance - a.outstandingBalance);

  return NextResponse.json(debtors);
}
