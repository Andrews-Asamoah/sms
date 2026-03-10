import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasSchoolAccess } from "@/lib/auth/school-access";

// GET all bills (invoices)
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
  const status = searchParams.get("status");
  const classId = searchParams.get("classId");
  const studentId = searchParams.get("studentId");
  const queryYearId = searchParams.get("academicYearId");
  const queryTermId = searchParams.get("termId");

  // Read Working Context from cookies
  const cookieStore = await import("next/headers").then(mod => mod.cookies());
  const workingYearId = (await cookieStore).get(`sms_working_year_${schoolSlug}`)?.value;
  const workingTermId = (await cookieStore).get(`sms_working_term_${schoolSlug}`)?.value;

  const schoolWithSettings = await prisma.school.findUnique({
    where: { id: school.id },
    select: { settings: true },
  });
  const settings = (schoolWithSettings?.settings as any) || {};

  const effectiveYearId = queryYearId === "all" ? undefined : (queryYearId || workingYearId || settings.currentAcademicYearId);
  const effectiveTermId = queryTermId === "all" ? undefined : (queryTermId || workingTermId || settings.currentTermId);

  const whereClause: any = { schoolId: school.id };
  if (status) {
    if (status.includes(",")) {
      whereClause.status = { in: status.split(",") };
    } else {
      whereClause.status = status;
    }
  }
  if (classId) whereClause.student = { classId };
  if (studentId) whereClause.studentId = studentId;
  if (effectiveYearId) whereClause.academicYearId = effectiveYearId;
  if (effectiveTermId) whereClause.termId = effectiveTermId;

  try {
    const bills = await prisma.bill.findMany({
      where: whereClause,
      include: {
        student: {
          select: { profile: true, class: { select: { name: true } } },
        },
        feeStructure: { select: { name: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(bills);
  } catch (error) {
    console.error("Fetch Bills Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 },
    );
  }
}
