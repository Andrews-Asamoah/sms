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
  const { feeStructureId, targetClasses } = body;

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

    const result = await prisma.$transaction(async (tx) => {
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

      const billYear = academicYear.name.replace(/\s+/g, "");
      const termName = "T1"; // Ideally fetch term name too

      console.log(`[GenerateInvoices] Target classes:`, targetClasses);
      // Find students in these classes
      const studentsToBill = await tx.student.findMany({
        where: {
          schoolId: school.id,
          status: "ACTIVE",
          classId: { in: targetClasses },
        },
        select: { id: true, studentId: true, classId: true },
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
          const bill = await tx.bill.create({
            data: {
              schoolId: school.id,
              studentId: student.id,
              academicYearId: currentYearId,
              termId: currentTermId,
              feeStructureId: feeStructure.id,
              billNumber: `BILL-${billYear}-${termName}-${Math.floor(Math.random() * 10000)}`,
              totalAmount: totalAmount,
              balanceAmount: totalAmount,
              paidAmount: 0,
              status: "PENDING",
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              notes: body.notes || null,
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

          await tx.student.update({
            where: { id: student.id },
            data: {
              outstandingBalance: { increment: totalAmount },
            },
          });
          createdBillsCount++;
        }
      }

      return { createdBillsCount };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Generate Invoices Error:", error);
    return NextResponse.json(
      { error: "Failed to generate invoices" },
      { status: 500 },
    );
  }
}
