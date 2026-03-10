import prisma from "@/lib/prisma";

interface ProcessPaymentParams {
  schoolId: string;
  studentId: string;
  billId: string;
  amount: number;
  reference: string;
  paymentMethod: any; // "ONLINE" or "PAYSTACK" depending on schema
  notes?: string;
  recordedById?: string;
}

export async function processSequentialPayment({
  schoolId,
  studentId,
  billId,
  amount,
  reference,
  paymentMethod,
  notes,
  recordedById,
}: ProcessPaymentParams) {
  return await prisma.$transaction(async (tx) => {
    // 1. Check idempotency: Ensure this reference hasn't been processed already
    const existingPayment = await tx.payment.findFirst({
      where: { schoolId, referenceNumber: reference, status: "COMPLETED" },
    });

    if (existingPayment) {
      return existingPayment;
    }

    // 2. Find Bill
    const bill = await tx.bill.findUnique({
      where: { id: billId, schoolId },
      include: {
        items: {
          orderBy: { createdAt: "asc" },
        },
        student: {
          select: {
            profile: { select: { firstName: true, lastName: true } },
            class: { select: { name: true } },
          },
        },
        school: {
          select: { subdomain: true }
        }
      },
    });

    if (!bill) throw new Error("Bill not found.");
    if (bill.status === "PAID") throw new Error("Bill is already fully paid.");

    let remainingAmount = amount;
    const paymentItemsData: any[] = [];

    // 3. Create the Payment Record first to get the ID
    const payment = await tx.payment.create({
      data: {
        schoolId,
        studentId,
        billId: bill.id,
        paymentNumber: `RCPT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        amount: amount,
        paymentMethod: paymentMethod,
        paymentDate: new Date(),
        referenceNumber: reference,
        transactionId: null, // Depending on if we tie to chart of accounts transaction
        status: "COMPLETED",
        notes: notes || "Online Payment via Paystack",
        recordedById: recordedById || null,
      },
    });

    // 4. Spread remainingAmount sequentially across bill items
    for (const item of bill.items) {
      if (remainingAmount <= 0) break;

      const itemBal = Number(item.balanceAmount);
      if (itemBal > 0) {
        const amountToPay = Math.min(remainingAmount, itemBal);
        const newPaid = Number(item.paidAmount) + amountToPay;
        const newBal = itemBal - amountToPay;

        await tx.billItem.update({
          where: { id: item.id },
          data: {
            paidAmount: newPaid,
            balanceAmount: newBal,
            status: newBal <= 0 ? "FULLY_PAID" : "PARTIALLY_PAID",
          },
        });

        await tx.paymentItem.create({
          data: {
            paymentId: payment.id,
            billItemId: item.id,
            amount: amountToPay,
          },
        });

        remainingAmount -= amountToPay;
      }
    }

    // 5. Update the Bill summary
    const newBillPaidAmount = Number(bill.paidAmount) + amount;
    const newBillBalanceAmount = Number(bill.balanceAmount) - amount;

    await tx.bill.update({
      where: { id: bill.id },
      data: {
        paidAmount: newBillPaidAmount,
        balanceAmount: newBillBalanceAmount,
        status: newBillBalanceAmount <= 0 ? "PAID" : "PARTIALLY_PAID",
      },
    });

    // 6. Update Student's outstanding balance
    await tx.student.update({
      where: { id: studentId },
      data: {
        outstandingBalance: { decrement: amount },
      },
    });

    // 7. Notify Accountants
    const accountants = await tx.member.findMany({
      where: {
        organization: { school: { id: schoolId } },
        role: { contains: "accountant" },
      },
      select: { userId: true },
    });

    const studentName = bill.student.profile ? `${bill.student.profile.firstName} ${bill.student.profile.lastName}` : "Student";
    const className = bill.student.class?.name || "N/A";

    if (accountants.length > 0) {
      const notifications = accountants.map((acc) => ({
        schoolId,
        userId: acc.userId,
        type: "ONLINE_PAYMENT" as any,
        title: "New Online Payment Received",
        message: `${studentName} (${className}) paid GHS ${amount.toFixed(2)} via Paystack. (Ref: ${reference})`,
        link: `/${bill.school.subdomain}/${accountants.length > 0 ? "accountant" : "admin"}/finance/payments`,
        isRead: false,
      }));

      await tx.notification.createMany({
        data: notifications,
      });
    }

    return payment;
  });
}
