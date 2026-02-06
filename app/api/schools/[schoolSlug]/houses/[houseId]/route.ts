// app/api/schools/[schoolSlug]/houses/[houseId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { Prisma } from "@/lib/generated/prisma/client";

const updateHouseSchema = z.object({
  name: z.string().min(2).optional(),
  code: z.string().min(2).max(10).optional(),
  description: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  motto: z.string().optional().nullable(),
  houseTeacherId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; houseId: string }> },
) {
  try {
    const { schoolSlug, houseId } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (!role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const house = await prisma.house.findUnique({
      where: {
        id: houseId,
        schoolId: school.id,
      },
      include: {
        houseTeacher: {
          include: {
            profile: true,
          },
        },
        _count: {
          select: {
            students: true,
            teachersInHouse: true,
          },
        },
      },
    });

    if (!house) {
      return NextResponse.json({ error: "House not found" }, { status: 404 });
    }

    return NextResponse.json(house);
  } catch (error) {
    console.error("[HOUSE_GET] Error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; houseId: string }> },
) {
  try {
    const { schoolSlug, houseId } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner" &&
      !session.isSuperAdmin
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateHouseSchema.parse(body);

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const existingHouse = await prisma.house.findUnique({
      where: {
        id: houseId,
        schoolId: school.id,
      },
    });

    if (!existingHouse) {
      return NextResponse.json({ error: "House not found" }, { status: 404 });
    }

    // Check code uniqueness if being changed
    if (validatedData.code && validatedData.code !== existingHouse.code) {
      const duplicate = await prisma.house.findFirst({
        where: {
          code: validatedData.code,
          schoolId: school.id,
          id: { not: houseId },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "House code already exists" },
          { status: 400 },
        );
      }
    }

    // Update house
    const updatedHouse = await prisma.house.update({
      where: { id: houseId },
      data: validatedData,
      include: {
        houseTeacher: {
          include: {
            profile: true,
          },
        },
        _count: {
          select: {
            students: true,
            teachersInHouse: true,
          },
        },
      },
    });

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entityType: "House",
        entityId: houseId,
        oldValues: existingHouse as Prisma.InputJsonValue,
        newValues: updatedHouse as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json(updatedHouse);
  } catch (error) {
    console.error("[HOUSE_PATCH] Error", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; houseId: string }> },
) {
  try {
    const { schoolSlug, houseId } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner" &&
      !session.isSuperAdmin
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const house = await prisma.house.findUnique({
      where: {
        id: houseId,
        schoolId: school.id,
      },
      include: {
        _count: {
          select: {
            students: true,
            teachersInHouse: true,
          },
        },
      },
    });

    if (!house) {
      return NextResponse.json({ error: "House not found" }, { status: 404 });
    }

    // Unassign students from this house before deletion
    if (house._count.students > 0) {
      await prisma.student.updateMany({
        where: { houseId: house.id },
        data: { houseId: null },
      });
    }

    // Unassign teachers from this house
    if (house._count.teachersInHouse > 0) {
      await prisma.teacher.updateMany({
        where: { houseId: house.id },
        data: { houseId: null },
      });
    }

    // Delete house
    await prisma.house.delete({
      where: { id: houseId },
    });

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE",
        entityType: "House",
        entityId: houseId,
        oldValues: house as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      success: true,
      message: `House deleted. ${house._count.students} students and ${house._count.teachersInHouse} teachers unassigned.`,
    });
  } catch (error) {
    console.error("[HOUSE_DELETE] Error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
