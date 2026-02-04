// app/api/schools/[schoolSlug]/set-global-year-term/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@/lib/generated/prisma";

const setGlobalSchema = z.object({
  academicYearId: z.string().min(1),
  termId: z.string().min(1),
  schoolId: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> }
) {
  try {
    const { schoolSlug } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    // Only admins and owners can set global settings
    if (
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner" &&
      !session.isSuperAdmin
    ) {
      return NextResponse.json(
        {
          error:
            "Insufficient permissions. Only admins and owners can change global settings.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = setGlobalSchema.parse(body);

    // Verify school exists
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug, id: validatedData.schoolId },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Verify academic year exists and belongs to school
    const academicYear = await prisma.academicYear.findUnique({
      where: {
        id: validatedData.academicYearId,
        schoolId: school.id,
      },
    });

    if (!academicYear) {
      return NextResponse.json(
        { error: "Academic year not found" },
        { status: 404 }
      );
    }

    // Verify term exists and belongs to the academic year
    const term = await prisma.term.findUnique({
      where: {
        id: validatedData.termId,
        academicYearId: validatedData.academicYearId,
      },
    });

    if (!term) {
      return NextResponse.json(
        {
          error:
            "Term not found or does not belong to the selected academic year",
        },
        { status: 404 }
      );
    }

    // Update school settings with global year and term
    interface SchoolSettings {
      currentAcademicYearId?: string;
      currentTermId?: string;
      lastUpdatedBy?: string;
      lastUpdatedAt?: string;
      [key: string]: unknown;
    }

    const currentSettings = (school.settings as SchoolSettings) || {};

    const updatedSettings: SchoolSettings = {
      ...currentSettings,
      currentAcademicYearId: validatedData.academicYearId,
      currentTermId: validatedData.termId,
      lastUpdatedBy: session.user.id,
      lastUpdatedAt: new Date().toISOString(),
    };

    // Update school with proper Prisma JSON type casting
    await prisma.school.update({
      where: { id: school.id },
      data: {
        settings: updatedSettings as Prisma.InputJsonValue,
      },
    });

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entityType: "School",
        entityId: school.id,
        oldValues: school.settings as Prisma.InputJsonValue,
        newValues: updatedSettings as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      success: true,
      academicYear: academicYear.name,
      term: term.name,
    });
  } catch (error) {
    console.error("[SET_GLOBAL_YEAR_TERM]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
