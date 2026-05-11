import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasSchoolAccess } from "@/lib/auth/school-access";
import { getActiveContext } from "@/lib/academic/get-active-context";

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

  const fees = await prisma.feeStructure.findMany({
    where: { schoolId: school.id },
    include: {
      items: true,
      _count: {
        select: { bills: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(fees);
}

export async function POST(
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

  const body = await request.json();
  const {
    name,
    description,
    classLevel,
    items,
    targetClasses,
    targetDepartments,
  } = body;

  // Transaction to create structure and items
  // If targetClasses or targetDepartments is provided, we might auto-generate bills?
  // Usually, Fee Structure is just a template. "Billing" is a separate action.
  // For now, we just create the Structure.
  // But user asked for "create bill items... depending all their classes or department".
  // This implies creating the Fee Structure template first.

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the Fee Structure Template with class relations
      const feeStructure = await tx.feeStructure.create({
        data: {
          schoolId: school.id,
          name,
          description,
          targetClasses: {
            create:
              targetClasses?.map((classId: string) => ({
                classId,
              })) || [],
          },
          items: {
            create: items.map((item: any) => ({
              name: item.name,
              amount: item.amount,
              isOptional: item.isOptional || false,
              description: item.description,
              registryItemId: item.registryItemId,
            })),
          },
        },
        include: {
          items: true,
          targetClasses: true,
        },
      });

      // 2. Automate Billing (if targets provided)
      let createdBillsCount = 0;
      if (
        (targetClasses && targetClasses.length > 0) ||
        (targetDepartments && targetDepartments.length > 0)
      ) {
        // Find students in these classes/departments
        const whereClause: any = {
          schoolId: school.id,
          status: "ACTIVE",
          OR: [],
        };

        if (targetClasses?.length) {
          whereClause.OR.push({ classId: { in: targetClasses } });
        }
        if (targetDepartments?.length) {
          whereClause.OR.push({ departmentId: { in: targetDepartments } });
        }

        const studentsToBill = await tx.student.findMany({
          where: whereClause,
          include: {
            profile: {
              select: { firstName: true, lastName: true, otherNames: true }
            },
            guardians: {
              include: {
                guardian: {
                  include: {
                    profile: {
                      select: { userId: true }
                    }
                  }
                }
              }
            }
          }
        });

        // Resolve user-scoped working context for billing period
        const feeCtx = await getActiveContext(
          schoolSlug,
          session.user.id,
          school.settings as Record<string, string | undefined>,
          { withNames: false },
        );
        const effectiveYearId = feeCtx.academicYearId;
        const effectiveTermId = feeCtx.termId;

        const [academicYear, term] = await Promise.all([
          tx.academicYear.findUnique({ where: { id: effectiveYearId || "" } }),
          tx.term.findUnique({ where: { id: effectiveTermId || "" } }),
        ]);

        if (academicYear && studentsToBill.length > 0) {
          const totalAmount = items.reduce(
            (sum: number, item: any) => sum + Number(item.amount),
            0,
          );

          const yearCode = academicYear.name.replace(/\s+/g, "").toUpperCase();
          const termCode = term ? `T${term.termNumber}` : "T1";

          for (const student of studentsToBill) {
            // Generate Unique Bill Code: B-YEAR-TERM-NUMBERS
            const randomNum = Math.floor(100000 + Math.random() * 900000);
            const billCode = `B-${yearCode}-${termCode}-${randomNum}`;

            const bill = await tx.bill.create({
              data: {
                schoolId: school.id,
                studentId: student.id,
                academicYearId: effectiveYearId as any,
                termId: effectiveTermId as any,
                feeStructureId: feeStructure.id,
                billNumber: billCode, // Using billCode for billNumber as well for simplicity if unique
                billCode: billCode,
                totalAmount: totalAmount,
                balanceAmount: totalAmount,
                paidAmount: 0,
                status: "PENDING",
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                items: {
                  create: feeStructure.items.map((item) => ({
                    description: item.name,
                    amount: item.amount,
                    quantity: 1,
                    totalAmount: item.amount,
                    feeItemId: item.id,
                    paidAmount: 0,
                    balanceAmount: item.amount,
                    status: "UNPAID",
                  })),
                },
              },
            });

            // Update Student Outstanding Balance
            await tx.student.update({
              where: { id: student.id },
              data: {
                outstandingBalance: { increment: totalAmount },
              },
            });

            // -----------------------------------------------------------------
            // 4. Send Notifications to Guardians
            // -----------------------------------------------------------------
            const studentName = [student.profile.firstName, student.profile.otherNames, student.profile.lastName]
              .filter(Boolean)
              .join(" ");

            const guardiansToNotify = student.guardians
              .filter(gs => gs.guardian.canLogin && gs.guardian.profile?.userId)
              .map(gs => gs.guardian.profile?.userId);

            for (const userId of guardiansToNotify) {
              if (userId) {
                await tx.notification.create({
                  data: {
                    schoolId: school.id,
                    userId: userId,
                    type: "FEE_REMINDER",
                    title: "New Bill Generated",
                    message: `A new bill ${bill.billNumber} has been generated for ${studentName}.`,
                    link: `/${schoolSlug}/guardian/fees`,
                    academicYearId: effectiveYearId as any,
                    termId: effectiveTermId as any,
                  }
                });
              }
            }

            createdBillsCount++;
          }
        }
      }

      return { feeStructure, createdBillsCount };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Create Fee Structure Error:", error);
    return NextResponse.json(
      { error: "Failed to create fee structure" },
      { status: 500 },
    );
  }
}
