import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { processSequentialPayment } from "@/lib/finance/payment-processor";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> }
) {
  const { schoolSlug } = await params;
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { reference, studentId, billId } = body;

    if (!reference || !studentId || !billId) {
      return NextResponse.json(
        { error: "Reference, studentId, and billId are required." },
        { status: 400 }
      );
    }

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Verify payment with Paystack
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      throw new Error("Paystack secret key is missing");
    }

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      }
    );

    const result = await response.json();

    if (!result.status) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    const data = result.data;
    if (data.status !== "success") {
      return NextResponse.json({ error: "Payment was not successful." }, { status: 400 });
    }

    // Amount is in pesewas/kobo, convert to main currency
    const amountPaid = data.amount / 100;

    // Use our shared sequential payment processor
    const payment = await processSequentialPayment({
      schoolId: school.id,
      studentId: studentId,
      billId: billId,
      amount: amountPaid,
      reference: reference,
      paymentMethod: "ONLINE", // Assuming mapped to our schema enum
    });

    return NextResponse.json({ success: true, payment });
  } catch (error) {
    console.error("[Paystack Verify Error]:", error);
    return NextResponse.json({ error: "Failed to verify payment." }, { status: 500 });
  }
}
