// app/api/schools/[schoolSlug]/academic-years/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { z } from "zod";

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const createAcademicYearSchema = z.object({
  name: z
    .string()
    .min(4, "Name must be at least 4 characters")
    .max(50, "Name must not exceed 50 characters")
    .trim(),
  startDate: z.string().datetime("Invalid start date format"),
  endDate: z.string().datetime("Invalid end date format"),
  schoolId: z.string().min(1, "School ID is required"),
  organizationId: z.string().min(1, "Organization ID is required"),
});

// ============================================================================
// POST - Create Academic Year
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;

    // Step 1: Verify session and school access
    console.log(`[AY_CREATE] Verifying access for ${schoolSlug}`);
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    // Step 2: Check authorization
    const canManage =
      session.isSuperAdmin ||
      role?.effectiveRole === "owner" ||
      role?.effectiveRole === "admin";

    if (!canManage) {
      console.warn(
        `[AY_CREATE] Access denied for user ${session.user.id} - insufficient permissions`,
      );
      return NextResponse.json(
        {
          error:
            "Insufficient permissions. Only admins and owners can create academic years.",
        },
        { status: 403 },
      );
    }

    // Step 3: Parse and validate request body
    const body = await request.json();
    console.log(`[AY_CREATE] Validating request data`);
    const validatedData = createAcademicYearSchema.parse(body);

    // Step 4: Verify school exists and belongs to organization
    const school = await prisma.school.findUnique({
      where: {
        subdomain: schoolSlug,
        id: validatedData.schoolId,
        organizationId: validatedData.organizationId,
      },
      include: {
        organization: {
          include: {
            members: {
              where: {
                userId: session.user.id,
              },
            },
          },
        },
      },
    });

    if (!school) {
      console.error(`[AY_CREATE] School not found: ${schoolSlug}`);
      return NextResponse.json(
        { error: "School not found or you don't have access" },
        { status: 404 },
      );
    }

    // Step 5: Verify user is a member of the organization
    if (!session.isSuperAdmin && school.organization.members.length === 0) {
      console.warn(
        `[AY_CREATE] User ${session.user.id} is not a member of organization ${school.organizationId}`,
      );
      return NextResponse.json(
        { error: "You are not a member of this school's organization" },
        { status: 403 },
      );
    }

    // Step 6: Validate dates
    const startDate = new Date(validatedData.startDate);
    const endDate = new Date(validatedData.endDate);

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 },
      );
    }

    // Validate reasonable duration (3-18 months)
    const diffInMonths =
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (diffInMonths < 3) {
      return NextResponse.json(
        { error: "Academic year must be at least 3 months long" },
        { status: 400 },
      );
    }
    if (diffInMonths > 18) {
      return NextResponse.json(
        { error: "Academic year should not exceed 18 months" },
        { status: 400 },
      );
    }

    // Step 7: Check for duplicate name
    const duplicateName = await prisma.academicYear.findFirst({
      where: {
        schoolId: school.id,
        name: validatedData.name,
      },
    });

    if (duplicateName) {
      return NextResponse.json(
        {
          error: `An academic year named "${validatedData.name}" already exists`,
        },
        { status: 409 },
      );
    }

    // Step 8: Check for overlapping academic years
    const overlapping = await prisma.academicYear.findFirst({
      where: {
        schoolId: school.id,
        OR: [
          {
            AND: [
              { startDate: { lte: startDate } },
              { endDate: { gte: startDate } },
            ],
          },
          {
            AND: [
              { startDate: { lte: endDate } },
              { endDate: { gte: endDate } },
            ],
          },
          {
            AND: [
              { startDate: { gte: startDate } },
              { endDate: { lte: endDate } },
            ],
          },
        ],
      },
    });

    if (overlapping) {
      return NextResponse.json(
        {
          error: `This academic year overlaps with "${
            overlapping.name
          }" (${new Date(overlapping.startDate).toLocaleDateString()} - ${new Date(
            overlapping.endDate,
          ).toLocaleDateString()})`,
        },
        { status: 409 },
      );
    }

    // Step 9: Check if this is the first academic year
    const existingYears = await prisma.academicYear.count({
      where: { schoolId: school.id },
    });
    const isFirstYear = existingYears === 0;

    console.log(
      `[AY_CREATE] Creating academic year "${validatedData.name}" for school ${school.id}`,
    );

    // Step 10: Create academic year
    const newYear = await prisma.academicYear.create({
      data: {
        name: validatedData.name,
        startDate,
        endDate,
        schoolId: school.id,
        isCurrent: false, // Always false, managed via global settings
      },
    });

    // Step 11: Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entityType: "AcademicYear",
        entityId: newYear.id,
        newValues: {
          name: newYear.name,
          startDate: newYear.startDate,
          endDate: newYear.endDate,
          schoolId: newYear.schoolId,
          durationMonths: diffInMonths.toFixed(1),
        },
      },
    });

    console.log(`[AY_CREATE] Successfully created academic year ${newYear.id}`);

    // Step 12: Build response
    const response = {
      ...newYear,
      ...(isFirstYear && {
        message:
          "First academic year created! Set it as the global default in settings.",
        suggestion:
          "Navigate to Global System Settings to set this as your active academic year",
      }),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("[AY_CREATE] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error. Please try again." },
      { status: 500 },
    );
  }
}

// ============================================================================
// GET - List Academic Years
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const academicYears = await prisma.academicYear.findMany({
      where: {
        schoolId: school.id,
      },
      include: {
        terms: {
          orderBy: { termNumber: "asc" },
        },
        _count: {
          select: {
            classes: true,
            enrollments: true,
            bills: true,
          },
        },
      },
      orderBy: { startDate: "desc" },
    });

    return NextResponse.json(academicYears);
  } catch (error) {
    console.error("[AY_LIST] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
