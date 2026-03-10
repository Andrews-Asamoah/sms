import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasSchoolAccess } from "@/lib/auth/school-access";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; itemId: string }> },
) {
  const { schoolSlug, itemId } = await params;
  const session = await getSession();

  if (!session || !hasSchoolAccess(session, schoolSlug)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, description, category, unit, minQuantity } = body;

    const item = await prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        name,
        description,
        category,
        unit,
        minQuantity,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("Update Inventory Item Error:", error);
    return NextResponse.json(
      { error: "Failed to update inventory item" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; itemId: string }> },
) {
  const { schoolSlug, itemId } = await params;
  const session = await getSession();

  if (!session || !hasSchoolAccess(session, schoolSlug)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.inventoryItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Inventory Item Error:", error);
    return NextResponse.json(
      { error: "Failed to delete inventory item" },
      { status: 500 },
    );
  }
}
