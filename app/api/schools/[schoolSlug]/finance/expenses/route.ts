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

  try {
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const expenses = await prisma.expense.findMany({
      where: { schoolId: school.id },
      include: {
        customCategory: true,
        recordedBy: {
          select: { name: true },
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error("Fetch Expenses Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch expenses" },
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

  try {
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      date,
      amount,
      category,
      customCategoryId,
      description,
      payee,
      paymentMethod,
      checkNumber,
      voucherNumber,
      referenceNumber,
    } = body;

    const expense = await prisma.expense.create({
      data: {
        schoolId: school.id,
        date: new Date(date),
        amount: Number(amount),
        category,
        customCategoryId,
        description,
        payee,
        paymentMethod: paymentMethod || "CASH",
        checkNumber,
        voucherNumber,
        referenceNumber,
        recordedById: session.user.id,
      },
      include: {
        customCategory: true,
      },
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error("Create Expense Error:", error);
    return NextResponse.json(
      { error: "Failed to create expense" },
      { status: 500 },
    );
  }
}
