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

  // Ensure user is actually a guardian
  if (
    access.effectiveRole !== "guardian" &&
    !access.profileRoles.includes("guardian")
  ) {
    return NextResponse.json(
      { error: "Forbidden. Must be a guardian." },
      { status: 403 },
    );
  }

  // Fetch the guardian profile
  const guardian = await prisma.guardian.findFirst({
    where: {
      profileId: session.user.id,
      school: { subdomain: schoolSlug },
    },
    include: {
      students: {
        include: {
          student: {
            select: {
              id: true,
              profile: true,
              class: { select: { name: true } },
              outstandingBalance: true,
            },
          },
        },
      },
    },
  });

  if (!guardian) {
    return NextResponse.json(
      { error: "Guardian profile not found" },
      { status: 404 },
    );
  }

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");
  const type = searchParams.get("type"); // "bills" or "payments"

  // Verify the requested studentId is actually their ward
  const authorizedStudentIds = guardian.students.map((gs) => gs.studentId);
  const targetStudentIds =
    studentId && authorizedStudentIds.includes(studentId)
      ? [studentId]
      : authorizedStudentIds;

  if (targetStudentIds.length === 0) {
    return NextResponse.json(
      { error: "No associated wards found." },
      { status: 404 },
    );
  }

  try {
    if (type === "payments") {
      const payments = await prisma.payment.findMany({
        where: { studentId: { in: targetStudentIds } },
        include: {
          student: { select: { profile: true } },
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
    } else {
      // type === "bills" or default
      const bills = await prisma.bill.findMany({
        where: { studentId: { in: targetStudentIds } },
        include: {
          student: { select: { profile: true } },
          feeStructure: { select: { name: true } },
          items: true,
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(bills);
    }
  } catch (error) {
    console.error("Fetch Guardian Finances Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch financial data" },
      { status: 500 },
    );
  }
}
