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

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const whereClause: any = { studentId: student.id };
  if (status) whereClause.status = status;

  try {
    const bills = await prisma.bill.findMany({
      where: whereClause,
      include: {
        feeStructure: { select: { name: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(bills);
  } catch (error) {
    console.error("Fetch Student Bills Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bills" },
      { status: 500 },
    );
  }
}
