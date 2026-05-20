import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasSchoolAccess } from "@/lib/auth/school-access";

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
    feeStructureId,
    targetClasses,
    billType = "INVOICE",
    classId = null,
  } = body;

  if (!feeStructureId || !targetClasses || !targetClasses.length) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 },
    );
  }

  try {
    // Fetch fee structure
    const feeStructure = await prisma.feeStructure.findUnique({
      where: { id: feeStructureId },
      include: { items: true },
    });

    if (!feeStructure) {
      return NextResponse.json(
        { error: "Fee structure not found" },
        { status: 404 },
      );
    }

    const result = await prisma.$transaction(
      async (tx) => {
        let createdBillsCount = 0;

        // Get current Academic Year and Term from settings
        const schoolWithSettings = await tx.school.findUnique({
          where: { id: school.id },
          select: { settings: true },
        });

        const settings = (schoolWithSettings?.settings as any) || {};
        const currentYearId = settings.currentAcademicYearId;
        const currentTermId = settings.currentTermId;

        if (!currentYearId) {
          throw new Error("No current academic year found in school settings.");
        }

        const academicYear = await tx.academicYear.findUnique({
          where: { id: currentYearId },
        });

        if (!academicYear) throw new Error("Academic year not found.");
        const term = currentTermId
          ? await tx.term.findUnique({ where: { id: currentTermId } })
          : null;

        // Replace "Academic Year" with "AY" and remove spaces (e.g., "2025/2026 Academic Year" -> "2025/2026AY")
        const billYear = academicYear.name.replace(/academic\s*year/i, "AY").replace(/\s+/g, "");
        let termName = "T1";
        if (term) {
          const match = term.name.match(/\d+/);
          if (match) {
            termName = `T${match[0]}`;
          } else {
            termName = term.name
              .replace(/\s+/g, "")
              .substring(0, 2)
              .toUpperCase();
          }
        }

        console.log(`[GenerateInvoices] Target classes:`, targetClasses);
        // Find students in these classes
        const studentsToBill = await tx.student.findMany({
          where: {
            schoolId: school.id,
            status: "ACTIVE",
            classId: { in: targetClasses },
          },
          include: {
            profile: {
              select: { firstName: true, lastName: true, otherNames: true },
            },
            guardians: {
              include: {
                guardian: {
                  include: {
                    profile: {
                      select: { userId: true },
                    },
                  },
                },
              },
            },
          },
        });

        if (studentsToBill.length === 0) {
          return {
            createdBillsCount: 0,
            message: "No active students found in the selected classes.",
          };
        }

        // Calculate total amount
        const totalAmount = feeStructure.items.reduce(
          (sum, item) => sum + Number(item.amount),
          0,
        );

        for (const student of studentsToBill) {
          // Check if bill already exists for this year/term
          const existingBill = await tx.bill.findFirst({
            where: {
              studentId: student.id,
              feeStructureId: feeStructure.id,
              academicYearId: currentYearId,
              termId: currentTermId,
            },
          });

          if (!existingBill) {
            // Fetch any unpaid bills from previous periods or from promotion placeholder (ARR-)
            const oldUnpaidBills = await tx.bill.findMany({
              where: {
                studentId: student.id,
                schoolId: school.id,
                status: { in: ["PENDING", "PARTIALLY_PAID", "OVERDUE"] },
                balanceAmount: { gt: 0 },
                OR: [
                  { academicYearId: { not: currentYearId } },
                  { termId: { not: currentTermId } },
                  { billNumber: { startsWith: "ARR-" } }
                ]
              },
            });

            const totalArrears = oldUnpaidBills.reduce(
              (sum, b) => sum + Number(b.balanceAmount),
              0
            );

            // Check for overpayment/credit (negative balance)
            const credit =
              Number(student.outstandingBalance) < 0
                ? Math.abs(Number(student.outstandingBalance))
                : 0;

            let finalBillTotal = totalAmount;

            const createdBillItems = feeStructure.items.map((item) => ({
              description: item.name,
              feeItemId: item.id as string | null | undefined,
              quantity: 1,
              amount: item.amount,
              totalAmount: item.amount,
              paidAmount: 0,
              balanceAmount: item.amount,
              status: "UNPAID" as any,
            }));

            if (totalArrears > 0) {
              createdBillItems.push({
                description: "Previous Balance (Arrears)",
                feeItemId: null,
                quantity: 1,
                amount: totalArrears as any,
                totalAmount: totalArrears as any,
                paidAmount: 0 as any,
                balanceAmount: totalArrears as any,
                status: "UNPAID" as any,
              });
              finalBillTotal += totalArrears;
            }

            if (credit > 0) {
              // Note: Currently Prisma schema for BillItem doesn't seem to have a free-text description
              // If credit needs to be a line item, it might require schema changes.
              // For now, we just reduce the finalBillTotal
              finalBillTotal -= credit;
            }

            const bill = await tx.bill.create({
              data: {
                schoolId: school.id,
                studentId: student.id,
                classId: classId || student.classId,
                academicYearId: currentYearId,
                termId: currentTermId,
                feeStructureId: feeStructure.id,
                billType: billType,
                billNumber: `BILL-${billYear}-${termName}-${Math.floor(100000 + Math.random() * 900000)}`,
                totalAmount: finalBillTotal,
                balanceAmount: finalBillTotal,
                paidAmount: 0,
                status: finalBillTotal <= 0 ? "PAID" : "PENDING",
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                notes: body.notes || null,
                items: {
                  create: createdBillItems,
                },
              },
            });

            // If arrears were consolidated, close the old bills
            if (totalArrears > 0) {
              for (const oldBill of oldUnpaidBills) {
                await tx.bill.update({
                  where: { id: oldBill.id },
                  data: {
                    status: "CANCELLED",
                    balanceAmount: 0,
                    notes: `${oldBill.notes || ""}\n[System] Balance carried forward and consolidated into invoice ${bill.billNumber}.`.trim(),
                  },
                });

                await tx.billItem.updateMany({
                  where: {
                    billId: oldBill.id,
                    status: { in: ["UNPAID", "PARTIALLY_PAID"] },
                  },
                  data: {
                    status: "FULLY_PAID",
                    balanceAmount: 0,
                  },
                });
              }
            }

            // Only increment outstanding balance if it's an INVOICE, not PROFORMA
            if (billType === "INVOICE") {
              await tx.student.update({
                where: { id: student.id },
                data: {
                  outstandingBalance: { increment: totalAmount },
                },
              });
            }

            // -----------------------------------------------------------------
            // 4. Send Notifications to Guardians
            // -----------------------------------------------------------------
            const studentName = [
              student.profile.firstName,
              student.profile.otherNames,
              student.profile.lastName,
            ]
              .filter(Boolean)
              .join(" ");

            const guardiansToNotify = student.guardians
              .filter(
                (gs) => gs.guardian.canLogin && gs.guardian.profile?.userId,
              )
              .map((gs) => gs.guardian.profile?.userId);

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
                    academicYearId: currentYearId,
                    termId: currentTermId,
                  },
                });
              }
            }

            createdBillsCount++;
          }
        }

        return { createdBillsCount };
      },
      {
        maxWait: 10000,
        timeout: 60000,
      },
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Generate Invoices Error:", error);
    return NextResponse.json(
      { error: "Failed to generate invoices" },
      { status: 500 },
    );
  }
}
