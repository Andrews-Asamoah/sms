// app/api/schools/[schoolSlug]/set-global-year-term/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const setGlobalSchema = z.object({
  academicYearId: z.string().min(1, "Academic year is required"),
  termId: z.string().min(1, "Term is required"),
  schoolId: z.string().min(1, "School ID is required"),
  organizationId: z.string().min(1, "Organization ID is required"),
});

// ============================================================================
// POST - Set Global Academic Year & Term
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;

    console.log(`[SET_GLOBAL] Processing request for ${schoolSlug}`);

    // Step 1: Verify session and school access
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    // Step 2: Check authorization - Only admins and owners
    const canManage =
      session.isSuperAdmin ||
      role?.effectiveRole === "owner" ||
      role?.effectiveRole === "admin";

    if (!canManage) {
      console.warn(
        `[SET_GLOBAL] Access denied for user ${session.user.id} - role: ${role?.effectiveRole}`,
      );
      return NextResponse.json(
        {
          error:
            "Insufficient permissions. Only admins and owners can change global calendar settings.",
        },
        { status: 403 },
      );
    }

    // Step 3: Parse and validate request body
    const body = await request.json();
    console.log(`[SET_GLOBAL] Validating request data`);
    const validatedData = setGlobalSchema.parse(body);

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
              where: { userId: session.user.id },
            },
          },
        },
      },
    });

    if (!school) {
      console.error(`[SET_GLOBAL] School not found: ${schoolSlug}`);
      return NextResponse.json(
        { error: "School not found or you don't have access" },
        { status: 404 },
      );
    }

    // Step 5: Verify user is a member of the organization
    if (!session.isSuperAdmin && school.organization.members.length === 0) {
      console.warn(
        `[SET_GLOBAL] User ${session.user.id} not a member of org ${school.organizationId}`,
      );
      return NextResponse.json(
        { error: "You are not a member of this school's organization" },
        { status: 403 },
      );
    }

    // Step 6: Verify academic year exists and belongs to school
    const academicYear = await prisma.academicYear.findUnique({
      where: {
        id: validatedData.academicYearId,
        schoolId: school.id,
      },
    });

    if (!academicYear) {
      console.error(
        `[SET_GLOBAL] Academic year not found: ${validatedData.academicYearId}`,
      );
      return NextResponse.json(
        { error: "Academic year not found or doesn't belong to this school" },
        { status: 404 },
      );
    }

    // Step 7: Verify term exists and belongs to the academic year
    const term = await prisma.term.findUnique({
      where: {
        id: validatedData.termId,
        academicYearId: validatedData.academicYearId,
      },
    });

    if (!term) {
      console.error(`[SET_GLOBAL] Term not found: ${validatedData.termId}`);
      return NextResponse.json(
        {
          error:
            "Term not found or does not belong to the selected academic year",
        },
        { status: 404 },
      );
    }

    // Step 8: Validate that term dates fall within academic year
    const yearStart = new Date(academicYear.startDate);
    const yearEnd = new Date(academicYear.endDate);
    const termStart = new Date(term.startDate);
    const termEnd = new Date(term.endDate);

    if (termStart < yearStart || termEnd > yearEnd) {
      console.error(`[SET_GLOBAL] Term dates outside academic year range`);
      return NextResponse.json(
        {
          error:
            "Invalid term selection: term dates fall outside academic year range",
        },
        { status: 400 },
      );
    }

    // Step 9: Prepare settings update
    interface SchoolSettings {
      currentAcademicYearId?: string;
      currentTermId?: string;
      lastUpdatedBy?: string;
      lastUpdatedAt?: string;
      [key: string]: unknown;
    }

    const currentSettings = (school.settings as SchoolSettings) || {};
    const previousSettings = {
      currentAcademicYearId: currentSettings.currentAcademicYearId,
      currentTermId: currentSettings.currentTermId,
    };

    const updatedSettings: SchoolSettings = {
      ...currentSettings,
      currentAcademicYearId: validatedData.academicYearId,
      currentTermId: validatedData.termId,
      lastUpdatedBy: session.user.id,
      lastUpdatedAt: new Date().toISOString(),
    };

    console.log(
      `[SET_GLOBAL] Updating global settings: ${academicYear.name} - ${term.name}`,
    );

    // Step 10: Perform update in transaction
    await prisma.$transaction(async (tx) => {
      // 1. Reset all isCurrent flags for this school's years and terms
      await tx.academicYear.updateMany({
        where: { schoolId: school.id },
        data: { isCurrent: false },
      });

      await tx.term.updateMany({
        where: { academicYear: { schoolId: school.id } },
        data: { isCurrent: false },
      });

      // 2. Set the new year and term as current
      await tx.academicYear.update({
        where: { id: validatedData.academicYearId },
        data: { isCurrent: true },
      });

      await tx.term.update({
        where: { id: validatedData.termId },
        data: { isCurrent: true },
      });

      // 3. Update school settings
      await tx.school.update({
        where: { id: school.id },
        data: {
          settings: updatedSettings as Prisma.InputJsonValue,
        },
      });

      // 4. Create audit log
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "UPDATE",
          entityType: "School",
          entityId: school.id,
          oldValues: {
            ...previousSettings,
            previousAcademicYearName: previousSettings.currentAcademicYearId
              ? (
                  await tx.academicYear.findUnique({
                    where: { id: previousSettings.currentAcademicYearId },
                    select: { name: true },
                  })
                )?.name
              : null,
            previousTermName: previousSettings.currentTermId
              ? (
                  await tx.term.findUnique({
                    where: { id: previousSettings.currentTermId },
                    select: { name: true },
                  })
                )?.name
              : null,
          } as Prisma.InputJsonValue,
          newValues: {
            currentAcademicYearId: validatedData.academicYearId,
            currentTermId: validatedData.termId,
            academicYearName: academicYear.name,
            termName: term.name,
            termNumber: term.termNumber,
          } as Prisma.InputJsonValue,
        },
      });
    });

    console.log(
      `[SET_GLOBAL] Successfully updated global settings for ${school.subdomain}`,
    );

    return NextResponse.json({
      success: true,
      academicYear: {
        id: academicYear.id,
        name: academicYear.name,
        startDate: academicYear.startDate,
        endDate: academicYear.endDate,
      },
      term: {
        id: term.id,
        name: term.name,
        termNumber: term.termNumber,
        startDate: term.startDate,
        endDate: term.endDate,
      },
      message: `Global settings updated to ${academicYear.name} - ${term.name}`,
    });
  } catch (error) {
    console.error("[SET_GLOBAL] Error:", error);

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
// GET - Get Current Global Settings
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: {
        id: true,
        settings: true,
      },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    interface SchoolSettings {
      currentAcademicYearId?: string;
      currentTermId?: string;
      lastUpdatedBy?: string;
      lastUpdatedAt?: string;
    }

    const settings = (school.settings as SchoolSettings) || {};

    // Fetch full details if IDs exist
    let academicYear = null;
    let term = null;

    if (settings.currentAcademicYearId) {
      academicYear = await prisma.academicYear.findUnique({
        where: { id: settings.currentAcademicYearId },
        include: {
          terms: {
            orderBy: { termNumber: "asc" },
          },
        },
      });
    }

    if (settings.currentTermId) {
      term = await prisma.term.findUnique({
        where: { id: settings.currentTermId },
      });
    }

    return NextResponse.json({
      currentAcademicYearId: settings.currentAcademicYearId,
      currentTermId: settings.currentTermId,
      lastUpdatedAt: settings.lastUpdatedAt,
      academicYear,
      term,
    });
  } catch (error) {
    console.error("[GET_GLOBAL] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
