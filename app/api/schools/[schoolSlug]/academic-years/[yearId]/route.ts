// app/api/schools/[schoolSlug]/academic-years/[yearId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { z } from "zod";

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const updateAcademicYearSchema = z.object({
  name: z
    .string()
    .min(4, "Name must be at least 4 characters")
    .max(50, "Name must not exceed 50 characters")
    .trim()
    .optional(),
  startDate: z.string().datetime("Invalid start date format").optional(),
  endDate: z.string().datetime("Invalid end date format").optional(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

interface SchoolSettings {
  currentAcademicYearId?: string;
  currentTermId?: string;
  [key: string]: unknown;
}

function getSchoolSettings(settings: unknown): SchoolSettings {
  if (!settings || typeof settings !== "object") {
    return {};
  }
  return settings as SchoolSettings;
}

// ============================================================================
// PATCH - Update Academic Year
// ============================================================================

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ schoolSlug: string; yearId: string }> },
) {
  try {
    const params = await context.params;
    const { schoolSlug, yearId } = params;

    // Validate that we have the required parameters
    if (!schoolSlug) {
      console.error("[AY_UPDATE] Missing schoolSlug parameter");
      return NextResponse.json(
        { error: "School identifier is required" },
        { status: 400 },
      );
    }

    if (!yearId) {
      console.error("[AY_UPDATE] Missing yearId parameter");
      return NextResponse.json(
        { error: "Academic year identifier is required" },
        { status: 400 },
      );
    }

    console.log(
      `[AY_UPDATE] Updating academic year ${yearId} for ${schoolSlug}`,
    );
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    // Check authorization
    const canManage =
      session.isSuperAdmin ||
      role?.effectiveRole === "owner" ||
      role?.effectiveRole === "admin";

    if (!canManage) {
      console.warn(`[AY_UPDATE] Access denied for user ${session.user.id}`);
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validatedData = updateAcademicYearSchema.parse(body);

    // First, get the school to verify access
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      console.error(`[AY_UPDATE] School not found: ${schoolSlug}`);
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Verify academic year exists and belongs to this school
    const existingYear = await prisma.academicYear.findFirst({
      where: {
        id: yearId,
        schoolId: school.id,
      },
      include: {
        terms: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });

    if (!existingYear) {
      console.error(
        `[AY_UPDATE] Academic year ${yearId} not found for school ${school.id}`,
      );
      return NextResponse.json(
        { error: "Academic year not found" },
        { status: 404 },
      );
    }

    // Validate dates if provided
    const startDate = validatedData.startDate
      ? new Date(validatedData.startDate)
      : new Date(existingYear.startDate);
    const endDate = validatedData.endDate
      ? new Date(validatedData.endDate)
      : new Date(existingYear.endDate);

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 },
      );
    }

    // Validate duration
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

    // Check if terms fit within new date range
    if (existingYear.terms.length > 0) {
      const invalidTerms = existingYear.terms.filter((term) => {
        const termStart = new Date(term.startDate);
        const termEnd = new Date(term.endDate);
        return termStart < startDate || termEnd > endDate;
      });

      if (invalidTerms.length > 0) {
        return NextResponse.json(
          {
            error: `Cannot update dates: ${invalidTerms.length} term(s) would fall outside the new date range. Please adjust or delete those terms first.`,
          },
          { status: 400 },
        );
      }
    }

    // Check for duplicate name if changing
    if (validatedData.name && validatedData.name !== existingYear.name) {
      const duplicate = await prisma.academicYear.findFirst({
        where: {
          schoolId: school.id,
          name: validatedData.name,
          id: { not: yearId },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          {
            error: `An academic year named "${validatedData.name}" already exists`,
          },
          { status: 409 },
        );
      }
    }

    // Check for overlapping years if changing dates
    if (validatedData.startDate || validatedData.endDate) {
      const overlapping = await prisma.academicYear.findFirst({
        where: {
          schoolId: school.id,
          id: { not: yearId },
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
            error: `Updated dates would overlap with "${overlapping.name}"`,
          },
          { status: 409 },
        );
      }
    }

    console.log(`[AY_UPDATE] Updating academic year with validated data`);

    // Update academic year
    const updatedYear = await prisma.academicYear.update({
      where: { id: yearId },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.startDate && { startDate }),
        ...(validatedData.endDate && { endDate }),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entityType: "AcademicYear",
        entityId: updatedYear.id,
        oldValues: {
          name: existingYear.name,
          startDate: existingYear.startDate,
          endDate: existingYear.endDate,
        },
        newValues: {
          name: updatedYear.name,
          startDate: updatedYear.startDate,
          endDate: updatedYear.endDate,
        },
      },
    });

    console.log(`[AY_UPDATE] Successfully updated academic year ${yearId}`);

    return NextResponse.json(updatedYear);
  } catch (error) {
    console.error("[AY_UPDATE] Error:", error);

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
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE - Delete Academic Year
// ============================================================================

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ schoolSlug: string; yearId: string }> },
) {
  try {
    const params = await context.params;
    const { schoolSlug, yearId } = params;

    // Validate that we have the required parameters
    if (!schoolSlug) {
      console.error("[AY_DELETE] Missing schoolSlug parameter");
      return NextResponse.json(
        { error: "School identifier is required" },
        { status: 400 },
      );
    }

    if (!yearId) {
      console.error("[AY_DELETE] Missing yearId parameter");
      return NextResponse.json(
        { error: "Academic year identifier is required" },
        { status: 400 },
      );
    }

    console.log(
      `[AY_DELETE] Attempting to delete academic year ${yearId} for school ${schoolSlug}`,
    );
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    // Check authorization
    const canManage =
      session.isSuperAdmin ||
      role?.effectiveRole === "owner" ||
      role?.effectiveRole === "admin";

    if (!canManage) {
      console.warn(`[AY_DELETE] Access denied for user ${session.user.id}`);
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    // First, get the school to verify access
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: {
        id: true,
        settings: true,
      },
    });

    if (!school) {
      console.error(`[AY_DELETE] School not found: ${schoolSlug}`);
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    console.log(`[AY_DELETE] Found school ${school.id}`);

    // Verify academic year exists and belongs to this school
    const existingYear = await prisma.academicYear.findFirst({
      where: {
        id: yearId,
        schoolId: school.id,
      },
      include: {
        _count: {
          select: {
            classes: true,
            enrollments: true,
            bills: true,
            terms: true,
          },
        },
      },
    });

    if (!existingYear) {
      console.error(
        `[AY_DELETE] Academic year ${yearId} not found for school ${school.id}`,
      );
      return NextResponse.json(
        { error: "Academic year not found" },
        { status: 404 },
      );
    }

    console.log(`[AY_DELETE] Found academic year ${existingYear.name}`);

    // Check if year is set as global
    const globalSettings = getSchoolSettings(school.settings);

    if (globalSettings.currentAcademicYearId === yearId) {
      console.warn(`[AY_DELETE] Cannot delete global academic year ${yearId}`);
      return NextResponse.json(
        {
          error:
            "Cannot delete the global default academic year. Please change global settings first.",
        },
        { status: 400 },
      );
    }

    // Check for dependencies
    const dependencies: string[] = [];
    if (existingYear._count.classes > 0) {
      dependencies.push(`${existingYear._count.classes} class(es)`);
    }
    if (existingYear._count.enrollments > 0) {
      dependencies.push(`${existingYear._count.enrollments} enrollment(s)`);
    }
    if (existingYear._count.bills > 0) {
      dependencies.push(`${existingYear._count.bills} bill(s)`);
    }
    if (existingYear._count.terms > 0) {
      dependencies.push(`${existingYear._count.terms} term(s)`);
    }

    if (dependencies.length > 0) {
      console.warn(
        `[AY_DELETE] Academic year ${yearId} has dependencies: ${dependencies.join(", ")}`,
      );
      return NextResponse.json(
        {
          error: `Cannot delete academic year with existing dependencies: ${dependencies.join(
            ", ",
          )}. Please remove all associations first.`,
        },
        { status: 400 },
      );
    }

    console.log(`[AY_DELETE] Deleting academic year ${yearId}`);

    // Delete academic year
    await prisma.academicYear.delete({
      where: { id: yearId },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE",
        entityType: "AcademicYear",
        entityId: yearId,
        oldValues: {
          name: existingYear.name,
          startDate: existingYear.startDate,
          endDate: existingYear.endDate,
          schoolId: existingYear.schoolId,
        },
      },
    });

    console.log(`[AY_DELETE] Successfully deleted academic year ${yearId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AY_DELETE] Error:", error);

    // Log the full error for debugging
    if (error instanceof Error) {
      console.error("[AY_DELETE] Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
