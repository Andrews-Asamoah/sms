import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * POST /api/schools/[schoolSlug]/academics/term-transition
 *
 * Closes the current term and optionally opens the next one.
 * Calculates and carries forward outstanding bill balances to each student's
 * outstandingBalance field.
 *
 * Body: { nextTermId?: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  const { schoolSlug } = await params;
  const session = await auth.api.getSession({ headers: req.headers });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.session.activeOrganizationId ? "org-member" : "user";

  try {
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true, settings: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const { nextTermId } = await req.json().catch(() => ({}));

    const result = await prisma.$transaction(async (tx) => {
      // 1. Find the current active term
      const currentTerm = await tx.term.findFirst({
        where: {
          isCurrent: true,
          academicYear: { schoolId: school.id },
        },
        include: { academicYear: { select: { id: true, name: true } } },
      });

      if (!currentTerm) {
        throw new Error("No active term found. Please set a current term first.");
      }

      // 2. Find all outstanding bills for this term
      const outstandingBills = await tx.bill.findMany({
        where: {
          schoolId: school.id,
          termId: currentTerm.id,
          status: { not: "PAID" },
          balanceAmount: { gt: 0 },
        },
        select: {
          studentId: true,
          balanceAmount: true,
        },
      });

      // 3. Aggregate outstanding balances by student
      const balanceByStudent: Record<string, number> = {};
      for (const bill of outstandingBills) {
        const current = balanceByStudent[bill.studentId] || 0;
        balanceByStudent[bill.studentId] =
          current + Number(bill.balanceAmount);
      }

      // 4. Update each student's outstandingBalance
      const studentUpdates = Object.entries(balanceByStudent).map(
        ([studentId, amount]) =>
          tx.student.update({
            where: { id: studentId },
            data: {
              outstandingBalance: { increment: amount },
            },
          }),
      );
      await Promise.all(studentUpdates);

      // 5. Mark current term as no longer current
      await tx.term.update({
        where: { id: currentTerm.id },
        data: { isCurrent: false },
      });

      // 6. Activate the next term if provided
      let nextTerm = null;
      if (nextTermId) {
        nextTerm = await tx.term.update({
          where: { id: nextTermId },
          data: { isCurrent: true },
        });

        // 7. Synchronize school settings
        const schoolSettings = (school.settings as any) || {};
        await tx.school.update({
          where: { id: school.id },
          data: {
            settings: {
              ...schoolSettings,
              currentTermId: nextTermId,
            },
          },
        });
      }

      return {
        closedTerm: { id: currentTerm.id, name: currentTerm.name },
        nextTerm: nextTerm
          ? { id: nextTerm.id, name: nextTerm.name }
          : null,
        studentsUpdated: studentUpdates.length,
        totalCarryForward: Object.values(balanceByStudent).reduce(
          (s, a) => s + a,
          0,
        ),
      };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("[TERM_TRANSITION]", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/schools/[schoolSlug]/academics/term-transition
 * Returns the current term and all terms for the active academic year,
 * plus a preview of outstanding balances.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  const { schoolSlug } = await params;
  const session = await auth.api.getSession({ headers: req.headers });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const currentTerm = await prisma.term.findFirst({
      where: {
        isCurrent: true,
        academicYear: { schoolId: school.id },
      },
      include: {
        academicYear: {
          select: {
            id: true,
            name: true,
            terms: {
              orderBy: { termNumber: "asc" },
              select: { id: true, name: true, termNumber: true, isCurrent: true },
            },
          },
        },
      },
    });

    if (!currentTerm) {
      return NextResponse.json({ currentTerm: null, allTerms: [], preview: null });
    }

    // Preview: count students with outstanding bills this term
    const outstandingBills = await prisma.bill.findMany({
      where: {
        schoolId: school.id,
        termId: currentTerm.id,
        status: { not: "PAID" },
        balanceAmount: { gt: 0 },
      },
      select: { studentId: true, balanceAmount: true },
    });

    const balanceByStudent: Record<string, number> = {};
    for (const b of outstandingBills) {
      balanceByStudent[b.studentId] =
        (balanceByStudent[b.studentId] || 0) + Number(b.balanceAmount);
    }

    const allTerms = currentTerm.academicYear.terms;

    return NextResponse.json({
      currentTerm: { id: currentTerm.id, name: currentTerm.name },
      allTerms,
      preview: {
        studentsWithBalance: Object.keys(balanceByStudent).length,
        totalOutstanding: Object.values(balanceByStudent).reduce(
          (s, a) => s + a,
          0,
        ),
      },
    });
  } catch (error) {
    console.error("[TERM_TRANSITION_GET]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
