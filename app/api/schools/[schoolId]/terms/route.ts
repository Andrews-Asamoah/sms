// app/api/schools/[schoolSlug]/terms/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { z } from "zod";

const createTermSchema = z.object({
  name: z.string().min(1),
  termNumber: z.number().int().positive(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  academicYearId: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> }
) {
  try {
    const { schoolSlug } = await params;
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
    const validatedData = createTermSchema.parse(body);

    // Verify academic year exists
    const academicYear = await prisma.academicYear.findUnique({
      where: { id: validatedData.academicYearId },
      include: { school: true },
    });

    if (!academicYear || academicYear.school.subdomain !== schoolSlug) {
      return NextResponse.json(
        { error: "Academic year not found" },
        { status: 404 }
      );
    }

    // Validate dates
    const startDate = new Date(validatedData.startDate);
    const endDate = new Date(validatedData.endDate);

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      );
    }

    // Check for duplicate term number
    const existingTerm = await prisma.term.findFirst({
      where: {
        academicYearId: validatedData.academicYearId,
        termNumber: validatedData.termNumber,
      },
    });

    if (existingTerm) {
      return NextResponse.json(
        { error: `Term ${validatedData.termNumber} already exists` },
        { status: 409 }
      );
    }

    // Create term
    const newTerm = await prisma.term.create({
      data: {
        name: validatedData.name,
        termNumber: validatedData.termNumber,
        startDate,
        endDate,
        academicYearId: validatedData.academicYearId,
        isCurrent: false, // Set via global settings
      },
    });

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entityType: "Term",
        entityId: newTerm.id,
        newValues: newTerm,
      },
    });

    return NextResponse.json(newTerm, { status: 201 });
  } catch (error) {
    console.error("[TERMS_POST]", error);

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
