import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * GET /api/schools/[schoolSlug]/finance/payroll/[recordId]/payslips
 * Fetch all payslips for a specific payroll record
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; recordId: string }> },
) {
  const { recordId } = await params;
  const session = await auth.api.getSession({ headers: req.headers });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payslips = await prisma.payslip.findMany({
      where: { payrollRecordId: recordId },
      include: {
        teacher: {
          include: { profile: { select: { firstName: true, lastName: true } } },
        },
        staff: {
          include: { profile: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    return NextResponse.json({ payslips });
  } catch (error) {
    console.error("[PAYSLIPS_GET]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/schools/[schoolSlug]/finance/payroll/[recordId]/payslips
 * Bulk update payslips (e.g., mark as PAID)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; recordId: string }> },
) {
  const { recordId } = await params;
  const session = await auth.api.getSession({ headers: req.headers });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { status, paidAt } = await req.json();

    // Map request status to Prisma enums
    // Payslip paymentStatus uses PaymentStatus enum (PENDING, COMPLETED, FAILED, etc.)
    // PayrollRecord status uses PayrollStatus enum (DRAFT, APPROVED, PAID, CANCELLED)
    const payslipPaymentStatus = status === "PAID" ? "COMPLETED" : "PENDING";
    const payrollRecordStatus = status === "PAID" ? "PAID" : "APPROVED";

    await prisma.$transaction([
      // Update all payslips in this record
      prisma.payslip.updateMany({
        where: { payrollRecordId: recordId },
        data: {
          paymentStatus: payslipPaymentStatus as any,
          paidAt: paidAt ? new Date(paidAt) : null,
        },
      }),
      // Update the main record status if all are paid
      prisma.payrollRecord.update({
        where: { id: recordId },
        data: {
          status: payrollRecordStatus,
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PAYSLIPS_PATCH]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
