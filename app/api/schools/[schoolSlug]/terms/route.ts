// app/api/schools/[schoolSlug]/terms/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { z } from "zod";

const createTermSchema = z.object({
  name: z.string().min(1),
  termNumber: z.number().int().positive(),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid start date format",
  }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid end date format",
  }),
  academicYearId: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;
    console.log(`[TERM_CREATE] Creating term for ${schoolSlug}`);

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
    const validatedData = createTermSchema.parse(body);

    // First, get the school to verify access
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      console.error(`[TERM_CREATE] School not found: ${schoolSlug}`);
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Verify academic year exists and belongs to this school
    const academicYear = await prisma.academicYear.findFirst({
      where: {
        id: validatedData.academicYearId,
        schoolId: school.id,
      },
    });

    if (!academicYear) {
      console.error(
        `[TERM_CREATE] Academic year ${validatedData.academicYearId} not found for school ${school.id}`,
      );
      return NextResponse.json(
        { error: "Academic year not found or does not belong to this school" },
        { status: 404 },
      );
    }

    // Validate dates
    const startDate = new Date(validatedData.startDate);
    const endDate = new Date(validatedData.endDate);

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 },
      );
    }

    // Validate that term dates fall within academic year
    const yearStart = new Date(academicYear.startDate);
    const yearEnd = new Date(academicYear.endDate);

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

    // Check for duplicate term number
    const existingTerm = await prisma.term.findFirst({
      where: {
        academicYearId: validatedData.academicYearId,
        termNumber: validatedData.termNumber,
      },
    });

    if (existingTerm) {
      return NextResponse.json(
        {
          error: `Term ${validatedData.termNumber} already exists in this academic year`,
        },
        { status: 409 },
      );
    }

    // Check for overlapping terms
    const overlappingTerm = await prisma.term.findFirst({
      where: {
        academicYearId: validatedData.academicYearId,
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
          error: `Term dates overlap with "${overlappingTerm.name}"`,
        },
        { status: 409 },
      );
    }

    console.log(
      `[TERM_CREATE] Creating term "${validatedData.name}" for academic year ${academicYear.id}`,
    );

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
        newValues: {
          name: newTerm.name,
          termNumber: newTerm.termNumber,
          startDate: newTerm.startDate,
          endDate: newTerm.endDate,
          academicYearId: newTerm.academicYearId,
        },
      },
    });

    console.log(`[TERM_CREATE] Successfully created term ${newTerm.id}`);

    return NextResponse.json(newTerm, { status: 201 });
  } catch (error) {
    console.error("[TERMS_POST]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
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
    const { searchParams } = new URL(request.url);
    const academicYearId = searchParams.get("academicYearId");

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const terms = await prisma.term.findMany({
      where: {
        AND: [
          { academicYear: { schoolId: school.id } },
          academicYearId ? { academicYearId: academicYearId } : {},
        ],
      },
      orderBy: { termNumber: "asc" },
    });

    return NextResponse.json(terms);
  } catch (error) {
    console.error("[TERMS_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
