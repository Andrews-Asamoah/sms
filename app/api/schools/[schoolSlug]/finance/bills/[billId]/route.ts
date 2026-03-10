import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; billId: string }> }
) {
  const { schoolSlug, billId } = await params;
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
    const bill = await prisma.bill.findUnique({
      where: { 
        id: billId,
        schoolId: school.id 
      },
      include: {
        student: {
          include: {
            profile: true
          }
        },
        feeStructure: true,
      }
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    // Verify user is guardian or has access (simplified for now as session is required)
    // In a real app, verify guardian-student relationship here too

    return NextResponse.json({
      bill: {
        id: bill.id,
        billNumber: bill.billNumber,
        totalAmount: Number(bill.totalAmount),
        paidAmount: Number(bill.paidAmount),
        balanceAmount: Number(bill.balanceAmount),
        studentId: bill.studentId,
        student: bill.student,
      },
      currency: school.currency,
    });
  } catch (error) {
    console.error("[Bill Fetch Error]:", error);
    return NextResponse.json(
      { error: "Failed to fetch bill details" },
      { status: 500 }
    );
  }
}
