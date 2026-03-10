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
      select: { id: true, settings: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Parse optional query param filters
    const { searchParams } = new URL(request.url);
    const filterItemId = searchParams.get("itemId") || undefined;
    const filterType = searchParams.get("type") as
      | "IN"
      | "OUT"
      | "ADJUSTMENT"
      | null;
    const filterFrom = searchParams.get("from");
    const filterTo = searchParams.get("to");

    const transactions = await prisma.inventoryTransaction.findMany({
      where: {
        schoolId: school.id,
        ...(filterItemId ? { itemId: filterItemId } : {}),
        ...(filterType ? { type: filterType } : {}),
        ...(filterFrom || filterTo
          ? {
              date: {
                ...(filterFrom ? { gte: new Date(filterFrom) } : {}),
                ...(filterTo ? { lte: new Date(filterTo) } : {}),
              },
            }
          : {}),
      },
      include: {
        item: { select: { id: true, name: true, category: true, unit: true } },
        performedBy: { select: { name: true } },
      },
      orderBy: { date: "desc" },
      take: 500,
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Fetch Inventory Transactions Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory transactions" },
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
      select: { id: true, settings: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      itemId,
      type,
      quantity,
      description,
      recipientId,
      recipientName,
      academicYearId,
      termId,
    } = body;

    // Get current academic year/term from school settings if not provided
    let finalYearId = academicYearId;
    let finalTermId = termId;

    if (!finalYearId) {
      interface SchoolSettings {
        currentAcademicYearId?: string;
        currentTermId?: string;
      }
      const settings = (school.settings as unknown as SchoolSettings) || {};
      finalYearId = settings.currentAcademicYearId;
      finalTermId = settings.currentTermId;
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Transaction
      const transaction = await tx.inventoryTransaction.create({
        data: {
          schoolId: school.id,
          itemId,
          type,
          quantity,
          description,
          performedById: session.user.id,
          recipientId,
          recipientName,
          academicYearId: finalYearId,
          termId: finalTermId,
        },
      });

      // 2. Update Item Quantity
      const adjustment =
        type === "IN" ? quantity : type === "OUT" ? -quantity : quantity;

      await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          quantity: {
            increment: adjustment,
          },
        },
      });

      return transaction;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Create Inventory Transaction Error:", error);
    return NextResponse.json(
      { error: "Failed to record transaction" },
      { status: 500 },
    );
  }
}
