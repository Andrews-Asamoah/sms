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

  try {
    const { searchParams } = new URL(request.url);
    const queryYearId = searchParams.get("academicYearId");
    const queryTermId = searchParams.get("termId");

    // Resolve user-scoped working context (cookie override → global setting)
    const ctx = await getActiveContext(
      schoolSlug,
      session.user.id,
      school.settings as Record<string, string | undefined>,
      { withNames: false },
    );

    const effectiveYearId = queryYearId === "all" ? undefined : (queryYearId || ctx.academicYearId);
    const effectiveTermId = queryTermId === "all" ? undefined : (queryTermId || ctx.termId);

    const whereClause: any = { schoolId: school.id };
    if (effectiveYearId || effectiveTermId) {
      whereClause.bill = {
        ...(effectiveYearId && { academicYearId: effectiveYearId }),
        ...(effectiveTermId && { termId: effectiveTermId }),
      };
    }

    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        student: {
          select: { profile: true, class: { select: { name: true } } },
        },
        bill: {
          select: {
            billNumber: true,
            feeStructure: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(payments);
  } catch (error) {
    console.error("Fetch Payments Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 },
    );
  }
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
    studentId,
    billId,
    amount,
    paymentMethod,
    referenceNumber,
    notes,
    paymentDate,
    items, // Array of { billItemId, amount, selected }
  } = body;

  if (!billId || !amount || parseFloat(amount) <= 0) {
    return NextResponse.json(
      { error: "Bill ID and a valid positive amount are required." },
      { status: 400 },
    );
  }

  if (items && Array.isArray(items)) {
    const calculatedTotal = items
      .filter((i: any) => i.selected)
      .reduce((sum: number, i: any) => sum + (parseFloat(i.amount) || 0), 0);

    // Allow a tiny floating point tolerance
    if (Math.abs(calculatedTotal - parseFloat(amount)) > 0.01) {
      return NextResponse.json(
        { error: "The total amount does not match the sum of distributed items." },
        { status: 400 },
      );
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find the target Bill and its items
      const bill = await tx.bill.findUnique({
        where: { id: billId, schoolId: school.id },
        include: { items: true },
      });

      if (!bill) throw new Error("Bill not found.");
      if (bill.status === "PAID")
        throw new Error("This bill is already fully paid.");

      const totalPayAmount = parseFloat(amount);

      // 2. Create the Payment Record
      const payment = await tx.payment.create({
        data: {
          schoolId: school.id,
          studentId: studentId || bill.studentId,
          billId: bill.id,
          paymentNumber: `RCPT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          amount: totalPayAmount,
          paymentMethod: paymentMethod || "CASH",
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          referenceNumber: referenceNumber || null,
          notes: notes || null,
          status: "COMPLETED",
        },
      });

      // 3. Process each paid item
      if (items && Array.isArray(items)) {
        for (const itemPay of items) {
          if (!itemPay.selected) continue;

          const payAmount = parseFloat(itemPay.amount);
          if (payAmount <= 0) continue;

          const billItem = bill.items.find((i) => i.id === itemPay.billItemId);
          if (!billItem) continue;

          // Update BillItem
          const newPaid = Number(billItem.paidAmount) + payAmount;
          const newBal = Number(billItem.balanceAmount) - payAmount;

          await tx.billItem.update({
            where: { id: billItem.id },
            data: {
              paidAmount: newPaid,
              balanceAmount: newBal,
              status: newBal <= 0 ? "FULLY_PAID" : "PARTIALLY_PAID",
            },
          });

          // Create PaymentItem link
          await tx.paymentItem.create({
            data: {
              paymentId: payment.id,
              billItemId: billItem.id,
              amount: payAmount,
            },
          });
        }
      }

      // 4. Update the Bill summary
      const newPaidAmount = Number(bill.paidAmount) + totalPayAmount;
      const newBalanceAmount = Number(bill.balanceAmount) - totalPayAmount;

      await tx.bill.update({
        where: { id: bill.id },
        data: {
          paidAmount: newPaidAmount,
          balanceAmount: newBalanceAmount,
          status: newBalanceAmount <= 0 ? "PAID" : "PARTIALLY_PAID",
        },
      });

      // 5. Update the Student's aggregate outstanding balance
      await tx.student.update({
        where: { id: studentId || bill.studentId },
        data: {
          outstandingBalance: { decrement: totalPayAmount },
        },
      });

      return payment;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Process Payment Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process payment.",
      },
      { status: 500 },
    );
  }
}
