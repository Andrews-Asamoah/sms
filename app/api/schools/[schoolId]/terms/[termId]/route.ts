// app/api/schools/[schoolSlug]/terms/[termId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { z } from "zod";

const updateTermSchema = z.object({
  name: z.string().min(1).optional(),
  termNumber: z.number().int().positive().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  academicYearId: z.string().min(1),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; termId: string }> }
) {
  try {
    const { schoolSlug, termId } = await params;
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
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateTermSchema.parse(body);

    // Verify term exists
    const existingTerm = await prisma.term.findUnique({
      where: { id: termId },
      include: {
        academicYear: {
          include: { school: true },
        },
      },
    });

    if (
      !existingTerm ||
      existingTerm.academicYear.school.subdomain !== schoolSlug
    ) {
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
        { status: 400 }
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
          { status: 409 }
        );
      }
    }

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
        oldValues: existingTerm,
        newValues: updatedTerm,
      },
    });

    return NextResponse.json(updatedTerm);
  } catch (error) {
    console.error("[TERM_PATCH]", error);

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; termId: string }> }
) {
  try {
    const { schoolSlug, termId } = await params;
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
        { status: 403 }
      );
    }

    // Verify term exists
    const existingTerm = await prisma.term.findUnique({
      where: { id: termId },
      include: {
        academicYear: {
          include: { school: true },
        },
        _count: {
          select: {
            enrollments: true,
            assessmentScores: true,
            bills: true,
          },
        },
      },
    });

    if (
      !existingTerm ||
      existingTerm.academicYear.school.subdomain !== schoolSlug
    ) {
      return NextResponse.json({ error: "Term not found" }, { status: 404 });
    }

    // Check if term is set as global
    const school = existingTerm.academicYear.school;
    interface SchoolSettings {
      currentAcademicYearId?: string;
      currentTermId?: string;
      lastUpdatedBy?: string;
      lastUpdatedAt?: string;
    }
    const globalSettings = (school.settings as SchoolSettings) || {};
    if (globalSettings.currentTermId === termId) {
      return NextResponse.json(
        { error: "Cannot delete the global default term" },
        { status: 400 }
      );
    }

    // Check if term has associations
    if (
      existingTerm._count.enrollments > 0 ||
      existingTerm._count.assessmentScores > 0 ||
      existingTerm._count.bills > 0
    ) {
      return NextResponse.json(
        {
          error:
            "Cannot delete term with existing enrollments, assessments, or bills. Please remove all associations first.",
        },
        { status: 400 }
      );
    }

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
        oldValues: existingTerm,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TERM_DELETE]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
