// app/api/schools/[schoolSlug]/terms/[termId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { z } from "zod";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

interface SchoolSettings {
  currentAcademicYearId?: string;
  currentTermId?: string;
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
  [key: string]: unknown;
}

function getSchoolSettings(settings: unknown): SchoolSettings {
  if (!settings || typeof settings !== "object") {
    return {};
  }
  return settings as SchoolSettings;
}

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const updateTermSchema = z.object({
  name: z.string().min(1).optional(),
  termNumber: z.number().int().positive().optional(),
  startDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid start date format",
    })
    .optional(),
  endDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid end date format",
    })
    .optional(),
  academicYearId: z.string().min(1),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; termId: string }> },
) {
  try {
    const { schoolSlug, termId } = await params;
    console.log(`[TERM_UPDATE] Updating term ${termId} for ${schoolSlug}`);

    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    // Check authorization
    if (
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner" &&
      !session.isSuperAdmin
    ) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const validatedData = updateTermSchema.parse(body);

    // First, get the school to verify access
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      console.error(`[TERM_UPDATE] School not found: ${schoolSlug}`);
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Verify term exists and belongs to this school
    const existingTerm = await prisma.term.findFirst({
      where: {
        id: termId,
        academicYear: {
          schoolId: school.id,
        },
      },
      include: {
        academicYear: true,
      },
    });

    if (!existingTerm) {
      console.error(
        `[TERM_UPDATE] Term ${termId} not found for school ${school.id}`,
      );
      return NextResponse.json({ error: "Term not found" }, { status: 404 });
    }

    // Validate dates if provided
    const startDate = validatedData.startDate
      ? new Date(validatedData.startDate)
      : new Date(existingTerm.startDate);
    const endDate = validatedData.endDate
      ? new Date(validatedData.endDate)
      : new Date(existingTerm.endDate);

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 },
      );
    }

    // Validate that term dates fall within academic year
    const yearStart = new Date(existingTerm.academicYear.startDate);
    const yearEnd = new Date(existingTerm.academicYear.endDate);

    if (startDate < yearStart) {
      return NextResponse.json(
        {
          error: `Term start date must be after academic year start (${yearStart.toLocaleDateString()})`,
        },
        { status: 400 },
      );
    }

    if (endDate > yearEnd) {
      return NextResponse.json(
        {
          error: `Term end date must be before academic year end (${yearEnd.toLocaleDateString()})`,
        },
        { status: 400 },
      );
    }

    // Check for duplicate term number if changing
    if (
      validatedData.termNumber &&
      validatedData.termNumber !== existingTerm.termNumber
    ) {
      const duplicate = await prisma.term.findFirst({
        where: {
          academicYearId: existingTerm.academicYearId,
          termNumber: validatedData.termNumber,
          id: { not: termId },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: `Term ${validatedData.termNumber} already exists` },
          { status: 409 },
        );
      }
    }

    // Check for overlapping terms if dates are changing
    if (validatedData.startDate || validatedData.endDate) {
      const overlappingTerm = await prisma.term.findFirst({
        where: {
          academicYearId: existingTerm.academicYearId,
          id: { not: termId },
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

      if (overlappingTerm) {
        return NextResponse.json(
          {
            error: `Updated dates would overlap with "${overlappingTerm.name}"`,
          },
          { status: 409 },
        );
      }
    }

    console.log(`[TERM_UPDATE] Updating term with validated data`);

    // Update term
    const updatedTerm = await prisma.term.update({
      where: { id: termId },
      data: {
        ...(validatedData.name && { name: validatedData.name }),
        ...(validatedData.termNumber && {
          termNumber: validatedData.termNumber,
        }),
        ...(validatedData.startDate && { startDate }),
        ...(validatedData.endDate && { endDate }),
      },
    });

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entityType: "Term",
        entityId: updatedTerm.id,
        oldValues: {
          name: existingTerm.name,
          termNumber: existingTerm.termNumber,
          startDate: existingTerm.startDate,
          endDate: existingTerm.endDate,
        },
        newValues: {
          name: updatedTerm.name,
          termNumber: updatedTerm.termNumber,
          startDate: updatedTerm.startDate,
          endDate: updatedTerm.endDate,
        },
      },
    });

    console.log(`[TERM_UPDATE] Successfully updated term ${termId}`);

    return NextResponse.json(updatedTerm);
  } catch (error) {
    console.error("[TERM_PATCH]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      console.error("[TERM_PATCH] Error details:", {
        message: error.message,
        stack: error.stack,
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; termId: string }> },
) {
  try {
    const { schoolSlug, termId } = await params;
    console.log(`[TERM_DELETE] Attempting to delete term ${termId}`);

    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    // Check authorization
    if (
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner" &&
      !session.isSuperAdmin
    ) {
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
      console.error(`[TERM_DELETE] School not found: ${schoolSlug}`);
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Verify term exists and belongs to this school
    const existingTerm = await prisma.term.findFirst({
      where: {
        id: termId,
        academicYear: {
          schoolId: school.id,
        },
      },
      include: {
        _count: {
          select: {
            enrollments: true,
            assessmentScores: true,
            bills: true,
          },
        },
      },
    });

    if (!existingTerm) {
      console.error(
        `[TERM_DELETE] Term ${termId} not found for school ${school.id}`,
      );
      return NextResponse.json({ error: "Term not found" }, { status: 404 });
    }

    // Check if term is set as global
    const globalSettings = getSchoolSettings(school.settings);

    if (globalSettings.currentTermId === termId) {
      console.warn(`[TERM_DELETE] Cannot delete global term ${termId}`);
      return NextResponse.json(
        {
          error:
            "Cannot delete the global default term. Please change global settings first.",
        },
        { status: 400 },
      );
    }

    // Check if term has associations
    const dependencies: string[] = [];
    if (existingTerm._count.enrollments > 0) {
      dependencies.push(`${existingTerm._count.enrollments} enrollment(s)`);
    }
    if (existingTerm._count.assessmentScores > 0) {
      dependencies.push(
        `${existingTerm._count.assessmentScores} assessment(s)`,
      );
    }
    if (existingTerm._count.bills > 0) {
      dependencies.push(`${existingTerm._count.bills} bill(s)`);
    }

    if (dependencies.length > 0) {
      console.warn(
        `[TERM_DELETE] Term ${termId} has dependencies: ${dependencies.join(", ")}`,
      );
      return NextResponse.json(
        {
          error: `Cannot delete term with existing dependencies: ${dependencies.join(", ")}. Please remove all associations first.`,
        },
        { status: 400 },
      );
    }

    console.log(`[TERM_DELETE] Deleting term ${termId}`);

    // Delete term
    await prisma.term.delete({
      where: { id: termId },
    });

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE",
        entityType: "Term",
        entityId: termId,
        oldValues: {
          name: existingTerm.name,
          termNumber: existingTerm.termNumber,
          startDate: existingTerm.startDate,
          endDate: existingTerm.endDate,
          academicYearId: existingTerm.academicYearId,
        },
      },
    });

    console.log(`[TERM_DELETE] Successfully deleted term ${termId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TERM_DELETE]", error);

    if (error instanceof Error) {
      console.error("[TERM_DELETE] Error details:", {
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
