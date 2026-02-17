import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ schoolSlug: string; feeStructureId: string }> },
) {
  try {
    const { schoolSlug, feeStructureId } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    // Check permissions
    if (
      role?.effectiveRole !== "owner" &&
      role?.effectiveRole !== "accountant" &&
      !session.isSuperAdmin
    ) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, classLevel, items } = body;

    // Verify fee structure belongs to this school
    const existingFeeStructure = await prisma.feeStructure.findFirst({
      where: {
        id: feeStructureId,
        schoolId: school.id,
      },
    });

    if (!existingFeeStructure) {
      return NextResponse.json(
        { error: "Fee structure not found" },
        { status: 404 },
      );
    }

    // Update fee structure and items in a transaction
    const updated = await prisma.$transaction(async (tx) => {
      // Delete existing items
      await tx.feeItem.deleteMany({
        where: { feeStructureId },
      });

      // Update fee structure with new items
      return tx.feeStructure.update({
        where: { id: feeStructureId },
        data: {
          name,
          description: description || null,
          classLevel: classLevel || null,
          items: {
            create: items.map((item: { name: string; amount: number }) => ({
              name: item.name,
              amount: item.amount,
            })),
          },
        },
        include: {
          items: true,
          _count: {
            select: { bills: true },
          },
        },
      });
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[FEE_STRUCTURE_PATCH]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ schoolSlug: string; feeStructureId: string }> },
) {
  try {
    const { schoolSlug, feeStructureId } = await params;
    const session = await requireSchoolAccess(schoolSlug);

    // CRITICAL: Only SuperAdmins can delete
    if (!session.isSuperAdmin) {
      return NextResponse.json(
        { error: "Only SuperAdministrators can delete fee structures" },
        { status: 403 },
      );
    }

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Check if fee structure exists and belongs to this school
    const feeStructure = await prisma.feeStructure.findFirst({
      where: {
        id: feeStructureId,
        schoolId: school.id,
      },
      include: {
        _count: {
          select: { bills: true },
        },
      },
    });

    if (!feeStructure) {
      return NextResponse.json(
        { error: "Fee structure not found" },
        { status: 404 },
      );
    }

    // If there are associated bills, soft delete instead
    if (feeStructure._count.bills > 0) {
      const softDeleted = await prisma.feeStructure.update({
        where: { id: feeStructureId },
        data: { isActive: false },
      });

      return NextResponse.json({
        message: "Fee structure deactivated (has associated bills)",
        feeStructure: softDeleted,
      });
    }

    // Hard delete if no bills
    await prisma.$transaction(async (tx) => {
      // Delete items first
      await tx.feeItem.deleteMany({
        where: { feeStructureId },
      });

      // Delete fee structure
      await tx.feeStructure.delete({
        where: { id: feeStructureId },
      });
    });

    return NextResponse.json({
      message: "Fee structure deleted successfully",
    });
  } catch (error) {
    console.error("[FEE_STRUCTURE_DELETE]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
