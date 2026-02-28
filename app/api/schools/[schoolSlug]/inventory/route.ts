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

    const items = await prisma.inventoryItem.findMany({
      where: { schoolId: school.id },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Fetch Inventory Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
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
    const { name, description, category, quantity, unit, minQuantity } = body;

    const item = await prisma.inventoryItem.create({
      data: {
        schoolId: school.id,
        name,
        description,
        category,
        quantity: quantity || 0,
        unit: unit || "pcs",
        minQuantity: minQuantity || 0,
      },
    });

    // Create Initial Transaction if quantity > 0
    if (quantity > 0) {
      await prisma.inventoryTransaction.create({
        data: {
          schoolId: school.id,
          itemId: item.id,
          type: "IN",
          quantity: quantity,
          description: "Initial stock",
          performedById: session.user.id,
        },
      });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("Create Inventory Item Error:", error);
    return NextResponse.json(
      { error: "Failed to create inventory item" },
      { status: 500 },
    );
  }
}
