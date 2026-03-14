import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { calculatePayrollBreakdown } from "@/lib/finance/payroll-utils";
import { getActiveSchoolRole } from "@/lib/auth/school-access";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  const { schoolSlug } = await params;
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Active role check
  const activeRole = await getActiveSchoolRole(session, schoolSlug);
  const effectiveRole = activeRole?.effectiveRole || "staff";

  // Allow staff, accountant, admin, owner, headteacher
  if (
    !["staff", "teacher", "accountant", "admin", "owner", "headteacher"].includes(effectiveRole) &&
    !session.isSuperAdmin
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Find staff profile for the current user
    const staff = await prisma.staff.findFirst({
      where: {
        schoolId: school.id,
        profile: {
          userId: session.user.id
        }
      },
      select: { monthlySalary: true, staffNumber: true, staffId: true }
    });

    if (!staff) {
      return NextResponse.json({ error: "Staff profile not found" }, { status: 404 });
    }

    const basicSalary = Number(staff.monthlySalary || 0);
    const breakdown = calculatePayrollBreakdown(basicSalary);

    return NextResponse.json({
      staffNumber: staff.staffNumber || staff.staffId,
      ...breakdown
    });
  } catch (error) {
    console.error("[STAFF_SALARY_STATS_GET]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
