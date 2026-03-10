import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasSchoolAccess } from "@/lib/auth/school-access";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; studentId: string }> },
) {
  const { schoolSlug, studentId } = await params;
  const session = await getSession();

  if (!session || !hasSchoolAccess(session, schoolSlug)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
  });
  if (!school)
    return NextResponse.json({ error: "School not found" }, { status: 404 });

  try {
    // Get current year/term from school settings
    const settings = (school.settings as any) || {};
    const currentYearId = settings.currentAcademicYearId;

    // Fetch Student data
    const student = await prisma.student.findUnique({
      where: { id: studentId, schoolId: school.id },
      include: {
        profile: true,
        class: { select: { name: true } },
      },
    });

    if (!student)
      return NextResponse.json({ error: "Student not found" }, { status: 404 });

    // Fetch all Bills for the student
    const bills = await prisma.bill.findMany({
      where: { studentId: student.id, schoolId: school.id },
      include: {
        academicYear: { select: { name: true } },
        term: { select: { name: true } },
        feeStructure: { select: { name: true } },
        items: {
          include: {
            feeItem: {
              select: {
                registryItem: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { issuedAt: "desc" },
    });

    // Fetch all Payments for the student
    const payments = await prisma.payment.findMany({
      where: { studentId: student.id, schoolId: school.id },
      include: {
        paymentItems: {
          include: {
            billItem: {
              select: { description: true },
            },
          },
        },
      },
      orderBy: { paymentDate: "desc" },
    });

    // Summary calculation
    const totalBilled = bills.reduce(
      (sum, b) => sum + Number(b.totalAmount),
      0,
    );
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const balance = totalBilled - totalPaid;

    return NextResponse.json({
      student: {
        name: `${student.profile.firstName} ${student.profile.lastName}`,
        studentId: student.studentId,
        className: student.class?.name || "N/A",
        outstandingBalance: student.outstandingBalance,
      },
      summary: {
        totalBilled,
        totalPaid,
        balance,
      },
      bills,
      payments,
    });
  } catch (error) {
    console.error("Student Statement Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch student statement" },
      { status: 500 },
    );
  }
}
