import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { getSchoolRole } from "@/lib/auth/school-access";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  const { schoolSlug } = await params;
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = getSchoolRole(session, schoolSlug);
  if (!access || !access.isActive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Ensure user is actually a student
  if (
    access.effectiveRole !== "student" &&
    !access.profileRoles.includes("student")
  ) {
    return NextResponse.json(
      { error: "Forbidden. Must be a student." },
      { status: 403 },
    );
  }

  // Fetch the student profile for this user in this school
  const student = await prisma.student.findFirst({
    where: {
      profileId: session.user.id,
      school: { subdomain: schoolSlug },
    },
  });

  if (!student) {
    return NextResponse.json(
      { error: "Student profile not found" },
      { status: 404 },
    );
  }

  try {
    const payments = await prisma.payment.findMany({
      where: { studentId: student.id },
      include: {
        bill: {
          select: {
            billNumber: true,
            feeStructure: { select: { name: true } },
          },
        },
      },
      orderBy: { paymentDate: "desc" },
    });
    return NextResponse.json(payments);
  } catch (error) {
    console.error("Fetch Student Payments Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 },
    );
  }
}
