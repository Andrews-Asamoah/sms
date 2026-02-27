import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasSchoolAccess } from "@/lib/auth/school-access";

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
    const payments = await prisma.payment.findMany({
      where: { schoolId: school.id },
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
  const { billId, amount, paymentMethod, referenceNumber, notes, paymentDate } =
    body;

  if (!billId || !amount || parseFloat(amount) <= 0) {
    return NextResponse.json(
      { error: "Bill ID and a valid positive amount are required." },
      { status: 400 },
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find the target Bill
      const bill = await tx.bill.findUnique({
        where: { id: billId, schoolId: school.id },
      });

      if (!bill) {
        throw new Error("Bill not found.");
      }

      if (bill.status === "PAID" || Number(bill.balanceAmount) <= 0) {
        throw new Error("This bill is already fully paid.");
      }

      const payAmount = parseFloat(amount);
      if (payAmount > Number(bill.balanceAmount)) {
        throw new Error(
          `Payment amount cannot exceed the balance of $${bill.balanceAmount}.`,
        );
      }

      // 2. Create the Payment Record
      const payment = await tx.payment.create({
        data: {
          schoolId: school.id,
          studentId: bill.studentId,
          billId: bill.id,
          paymentNumber: `RCPT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          amount: payAmount,
          paymentMethod: paymentMethod || "CASH",
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          referenceNumber: referenceNumber || null,
          notes: notes || null,
          status: "COMPLETED",
          // recordedById: session.user.id // Would add if tracking cashier exactly.
        },
      });

      // 3. Update the Bill
      const newPaidAmount = Number(bill.paidAmount) + payAmount;
      const newBalanceAmount = Number(bill.balanceAmount) - payAmount;
      const newStatus = newBalanceAmount === 0 ? "PAID" : "PARTIALLY_PAID";

      await tx.bill.update({
        where: { id: bill.id },
        data: {
          paidAmount: newPaidAmount,
          balanceAmount: newBalanceAmount,
          status: newStatus,
        },
      });

      // 4. Update the Student's aggregate outstanding balance
      await tx.student.update({
        where: { id: bill.studentId },
        data: {
          outstandingBalance: { decrement: payAmount },
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
