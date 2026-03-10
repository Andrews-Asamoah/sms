import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; studentId: string }> },
) {
  try {
    const { schoolSlug, studentId } = await params;
    await requireSchoolAccess(schoolSlug);

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const bills = await prisma.bill.findMany({
      where: {
        studentId,
        schoolId: school.id,
        status: {
          in: ["PENDING", "PARTIALLY_PAID"],
        },
      },
      include: {
        feeStructure: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(bills);
  } catch (error) {
    console.error("❌ Error fetching unpaid bills:", error);
    return NextResponse.json(
      { error: "Failed to fetch unpaid bills" },
      { status: 500 },
    );
  }
}
