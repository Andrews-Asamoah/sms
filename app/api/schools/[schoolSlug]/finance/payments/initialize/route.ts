import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import crypto from "crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> }
) {
  const { schoolSlug } = await params;
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
  });

  if (!school) {
    return NextResponse.json({ error: "School not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { studentId, billId, amount } = body;

    if (!studentId || !billId || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json(
        { error: "Valid studentId, billId, and positive amount are required." },
        { status: 400 }
      );
    }

    console.log("[Payment Init] Checking guardian auth for:", {
      userId: session.user.id,
      email: session.user.email,
      studentId
    });

    // Verify guardian has access to this student
    const guardian = await prisma.guardian.findFirst({
      where: {
        schoolId: school.id,
        OR: [
          { profile: { userId: session.user.id } },
          { email: session.user.email },
        ],
        students: { some: { studentId } },
      },
    });

    console.log("[Payment Init] Guardian found:", !!guardian);

    if (!guardian) {
      return NextResponse.json(
        { error: "You are not authorized to make payments for this student." },
        { status: 403 }
      );
    }

    // Verify bill exists and belongs to the student
    const bill = await prisma.bill.findUnique({
      where: { id: billId, schoolId: school.id, studentId },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found." }, { status: 404 });
    }

    if (bill.status === "PAID") {
      return NextResponse.json({ error: "This bill is already fully paid." }, { status: 400 });
    }

    if (Number(amount) > Number(bill.balanceAmount)) {
      return NextResponse.json(
        { error: "Payment amount cannot exceed the bill balance." },
        { status: 400 }
      );
    }

    // Generate a unique reference for Paystack
    const reference = `FEE-${school.id.slice(0, 4)}-${crypto.randomBytes(8).toString("hex")}`;

    // Normally we should store this pending payment, but for simplicity we rely on the Verify step
    // using this generated reference to make the charge.

    return NextResponse.json({
      reference,
      amount: Number(amount),
      email: session.user.email,
      publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
    });
  } catch (error) {
    console.error("[Paystack Initialize Error]:", error);
    return NextResponse.json(
      { error: "Failed to initialize payment." },
      { status: 500 }
    );
  }
}
