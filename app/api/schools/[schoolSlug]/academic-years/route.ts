// app/api/schools/[schoolSlug]/academic-years/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { z } from "zod";

const createAcademicYearSchema = z.object({
  name: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
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
    const validatedData = createAcademicYearSchema.parse(body);

    // Verify school exists
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug, id: validatedData.schoolId },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
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

    // Check for overlapping academic years
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
        ],
      },
    });

    if (overlapping) {
      return NextResponse.json(
        {
          error: `This academic year overlaps with "${overlapping.name}"`,
        },
        { status: 409 }
      );
    }

    // Check if this is the first academic year (for helpful messaging)
    const existingYears = await prisma.academicYear.count({
      where: { schoolId: school.id },
    });

    const isFirstYear = existingYears === 0;

    // Create academic year
    const newYear = await prisma.academicYear.create({
      data: {
        name: validatedData.name,
        startDate,
        endDate,
        schoolId: school.id,
        isCurrent: false, // Always false, set via global settings
      },
    });

    // If this is the first year, suggest setting it as global
    const message = isFirstYear
      ? "First academic year created! Don't forget to set it as the global default in settings."
      : undefined;

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entityType: "AcademicYear",
        entityId: newYear.id,
        newValues: newYear,
      },
    });

    return NextResponse.json({ ...newYear, message }, { status: 201 });
  } catch (error) {
    console.error("[ACADEMIC_YEARS_POST]", error);

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
