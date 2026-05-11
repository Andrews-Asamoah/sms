import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * POST /api/schools/[schoolSlug]/academics/term-transition
 *
 * Closes the current term and optionally opens the next one.
 * 1. Clones all ACTIVE enrolments to the new term (filtering out suspended students).
 * 2. Aggregates outstanding bill balances and creates ARREARS bills in the new term.
 * 3. Carries forward outstanding balances to each student's outstandingBalance field.
 *
 * Body: { nextTermId?: string, carryForwardArrears?: boolean }
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

  try {
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true, code: true, settings: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const { nextTermId, carryForwardArrears = true } = await req
      .json()
      .catch(() => ({}));

    const result = await prisma.$transaction(
      async (tx) => {
        // ──────────────────────────────────────────────────────────────────
        // 1. Find the current active term
        // ──────────────────────────────────────────────────────────────────
        const currentTerm = await tx.term.findFirst({
          where: {
            isCurrent: true,
            academicYear: { schoolId: school.id },
          },
          include: {
            academicYear: { select: { id: true, name: true } },
          },
        });

        if (!currentTerm) {
          throw new Error(
            "No active term found. Please set a current term first.",
          );
        }

        // ──────────────────────────────────────────────────────────────────
        // 2. Clone active enrolments to the next term
        // ──────────────────────────────────────────────────────────────────
        let enrollmentsCloned = 0;

        if (nextTermId) {
          // Verify the next term exists and get its academic year
          const nextTerm = await tx.term.findUnique({
            where: { id: nextTermId },
            select: { id: true, academicYearId: true },
          });

          if (!nextTerm) {
            throw new Error("Selected next term not found.");
          }

          // Get all active enrolments for the current term,
          // excluding students who are suspended
          const activeEnrollments = await tx.enrollment.findMany({
            where: {
              termId: currentTerm.id,
              academicYearId: currentTerm.academicYear.id,
              status: "ACTIVE",
              student: {
                schoolId: school.id,
                status: { not: "SUSPENDED" },
              },
            },
            select: {
              studentId: true,
              classId: true,
            },
          });

          if (activeEnrollments.length > 0) {
            // Create new enrolments for the next term
            const newEnrollments = activeEnrollments.map((e) => ({
              studentId: e.studentId,
              classId: e.classId,
              academicYearId: nextTerm.academicYearId,
              termId: nextTermId,
              status: "ACTIVE" as const,
            }));

            const created = await tx.enrollment.createMany({
              data: newEnrollments,
              skipDuplicates: true,
            });

            enrollmentsCloned = created.count;
          }
        }

        // ──────────────────────────────────────────────────────────────────
        // 3. Aggregate outstanding bill balances for the current term
        // ──────────────────────────────────────────────────────────────────
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

        const balanceByStudent: Record<string, number> = {};
        for (const bill of outstandingBills) {
          const current = balanceByStudent[bill.studentId] || 0;
          balanceByStudent[bill.studentId] =
            current + Number(bill.balanceAmount);
        }

        // ──────────────────────────────────────────────────────────────────
        // 4. Update each student's outstandingBalance
        // ──────────────────────────────────────────────────────────────────
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

        // ──────────────────────────────────────────────────────────────────
        // 5. Create ARREARS bills in the new term (if opted in)
        // ──────────────────────────────────────────────────────────────────
        let arrearsBillsCreated = 0;

        if (carryForwardArrears && nextTermId && Object.keys(balanceByStudent).length > 0) {
          // Find the next term to get its academicYearId
          const nextTermData = await tx.term.findUnique({
            where: { id: nextTermId },
            select: { academicYearId: true },
          });

          if (nextTermData) {
            const existingBillCount = await tx.bill.count({
              where: { schoolId: school.id },
            });

            let seq = existingBillCount;
            for (const [studentId, amount] of Object.entries(
              balanceByStudent,
            )) {
              seq++;
              const billNumber = `ARR-${school.code.substring(0, 6)}-${Date.now()}-${seq}`;

              const bill = await tx.bill.create({
                data: {
                  schoolId: school.id,
                  studentId,
                  academicYearId: nextTermData.academicYearId,
                  termId: nextTermId,
                  billNumber,
                  totalAmount: amount,
                  balanceAmount: amount,
                  status: "PENDING",
                  billType: "INVOICE",
                  notes: `Arrears carried forward from ${currentTerm.name}`,
                },
              });

              await tx.billItem.create({
                data: {
                  billId: bill.id,
                  description: "Previous Balance (Arrears)",
                  amount,
                  totalAmount: amount,
                  balanceAmount: amount,
                  status: "UNPAID",
                },
              });

              arrearsBillsCreated++;
            }
          }
        }

        // ──────────────────────────────────────────────────────────────────
        // 6. Mark current term as inactive
        // ──────────────────────────────────────────────────────────────────
        await tx.term.update({
          where: { id: currentTerm.id },
          data: { isCurrent: false },
        });

        // ──────────────────────────────────────────────────────────────────
        // 7. Activate the next term if provided
        // ──────────────────────────────────────────────────────────────────
        let nextTerm = null;
        if (nextTermId) {
          nextTerm = await tx.term.update({
            where: { id: nextTermId },
            data: { isCurrent: true },
          });

          // Synchronize school settings — must update BOTH yearId and termId
          // Bug fix: previously only currentTermId was synced, leaving
          // currentAcademicYearId pointing to the old year when transitioning
          // across year boundaries.
          const nextTermData = await tx.term.findUnique({
            where: { id: nextTermId },
            select: { academicYearId: true },
          });

          const schoolSettings = (school.settings as Record<string, unknown>) || {};
          const updatedSettings = {
            ...schoolSettings,
            currentTermId: nextTermId,
            currentAcademicYearId:
              nextTermData?.academicYearId ??
              (schoolSettings.currentAcademicYearId as string | undefined),
          };
          await tx.school.update({
            where: { id: school.id },
            data: {
              settings: updatedSettings as import("@/lib/generated/prisma").Prisma.InputJsonValue,
            },
          });
        }

        // ──────────────────────────────────────────────────────────────────
        // 8. Audit log
        // ──────────────────────────────────────────────────────────────────
        await tx.auditLog.create({
          data: {
            userId: session.user.id,
            action: "UPDATE",
            entityType: "System",
            entityId: "TermTransition",
            newValues: {
              event: "Term Transition Executed",
              closedTermId: currentTerm.id,
              closedTermName: currentTerm.name,
              nextTermId: nextTermId || null,
              enrollmentsCloned,
              arrearsBillsCreated,
              studentsWithBalances: studentUpdates.length,
            },
          },
        });

        return {
          closedTerm: { id: currentTerm.id, name: currentTerm.name },
          nextTerm: nextTerm
            ? { id: nextTerm.id, name: nextTerm.name }
            : null,
          enrollmentsCloned,
          studentsUpdated: studentUpdates.length,
          arrearsBillsCreated,
          totalCarryForward: Object.values(balanceByStudent).reduce(
            (s, a) => s + a,
            0,
          ),
        };
      },
      { timeout: 30000 },
    );

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
 * plus a preview of outstanding balances and active enrollment count.
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
              select: {
                id: true,
                name: true,
                termNumber: true,
                isCurrent: true,
              },
            },
          },
        },
      },
    });

    if (!currentTerm) {
      return NextResponse.json({
        currentTerm: null,
        allTerms: [],
        preview: null,
      });
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

    // Count active enrolments that would be cloned
    const activeEnrollmentCount = await prisma.enrollment.count({
      where: {
        termId: currentTerm.id,
        academicYearId: currentTerm.academicYear.id,
        status: "ACTIVE",
        student: {
          schoolId: school.id,
          status: { not: "SUSPENDED" },
        },
      },
    });

    // Count active teacher assignments for this academic year
    const teacherAssignmentCount = await prisma.teacherAssignment.count({
      where: {
        schoolId: school.id,
        academicYearId: currentTerm.academicYear.id,
        teacher: { isActive: true },
      },
    });

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
        activeEnrollmentCount,
        teacherAssignmentCount,
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
