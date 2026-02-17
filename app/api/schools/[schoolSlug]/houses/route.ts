// app/api/schools/[schoolSlug]/houses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";

const createHouseSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(10),
  description: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  motto: z.string().optional().nullable(),
  houseTeacherId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  schoolId: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;
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
    const validatedData = createHouseSchema.parse(body);

    // Verify school exists
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug, id: validatedData.schoolId },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Check if house code already exists
    const existingHouse = await prisma.house.findFirst({
      where: {
        code: validatedData.code,
        schoolId: school.id,
      },
    });

    if (existingHouse) {
      return NextResponse.json(
        { error: "House code already exists" },
        { status: 400 },
      );
    }

    // Create house
    const house = await prisma.house.create({
      data: {
        schoolId: school.id,
        name: validatedData.name,
        code: validatedData.code,
        description: validatedData.description,
        color: validatedData.color,
        motto: validatedData.motto,
        houseTeacherId: validatedData.houseTeacherId,
        isActive: validatedData.isActive,
      },
      include: {
        houseTeacher: {
          include: {
            profile: true,
          },
        },
      },
    });

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entityType: "House",
        entityId: house.id,
        newValues: {
          name: house.name,
          code: house.code,
        },
      },
    });

    return NextResponse.json(house, { status: 201 });
  } catch (error) {
    console.error("[HOUSES_POST] Error", error);

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;
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

    const houses = await prisma.house.findMany({
      where: { schoolId: school.id },
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(houses);
  } catch (error) {
    console.error("[HOUSES_GET] Error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
