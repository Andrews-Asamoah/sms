// app/api/schools/[schoolSlug]/classes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { slugify } from "@/lib/utils";

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const createClassSchema = z.object({
  name: z
    .string()
    .min(2, "Class name must be at least 2 characters")
    .max(50, "Class name must not exceed 50 characters")
    .trim(),
  level: z
    .string()
    .min(1, "Level is required")
    .max(20, "Level must not exceed 20 characters")
    .trim(),
  capacity: z.number().int().positive().max(500).nullable().optional(),
  classTeacherId: z.string().min(1).nullable().optional(),
  academicYearId: z.string().min(1, "Academic year is required"),
  departmentId: z.string().min(1).nullable().optional(),
  schoolId: z.string().min(1, "School ID is required"),
  organizationId: z.string().min(1, "Organization ID is required"),
  isActive: z.boolean().default(true).optional(),
  isGraduatingClass: z.boolean().default(false).optional(),
  order: z.number().int().optional().nullable(),
  nextPromotionClassId: z.string().nullable().optional(),
});

// ============================================================================
// POST - Create Class
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;

    console.log(`[CLASS_CREATE] Creating class for ${schoolSlug}`);

    // Step 1: Verify session and school access
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    // Step 2: Check authorization
    const canManage =
      session.isSuperAdmin ||
      role?.effectiveRole === "owner" ||
      role?.effectiveRole === "admin";

    if (!canManage) {
      console.warn(
        `[CLASS_CREATE] Access denied for user ${session.user.id} - insufficient permissions`,
      );
      return NextResponse.json(
        {
          error:
            "Insufficient permissions. Only admins and owners can create classes.",
        },
        { status: 403 },
      );
    }

    // Step 3: Parse and validate request body
    const body = await request.json();
    console.log(`[CLASS_CREATE] Validating request data`);
    const validatedData = createClassSchema.parse(body);

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
      console.error(`[CLASS_CREATE] School not found: ${schoolSlug}`);
      return NextResponse.json(
        { error: "School not found or you don't have access" },
        { status: 404 },
      );
    }

    // Step 5: Verify user is a member of the organization
    if (!session.isSuperAdmin && school.organization.members.length === 0) {
      console.warn(
        `[CLASS_CREATE] User ${session.user.id} is not a member of organization ${school.organizationId}`,
      );
      return NextResponse.json(
        { error: "You are not a member of this school's organization" },
        { status: 403 },
      );
    }

    // Step 6: Verify academic year belongs to this school
    const academicYear = await prisma.academicYear.findFirst({
      where: {
        id: validatedData.academicYearId,
        schoolId: school.id,
      },
    });

    if (!academicYear) {
      console.error(
        `[CLASS_CREATE] Academic year ${validatedData.academicYearId} not found for school ${school.id}`,
      );
      return NextResponse.json(
        { error: "Academic year not found or does not belong to this school" },
        { status: 404 },
      );
    }

    // Step 7: Verify teacher belongs to school if provided
    if (validatedData.classTeacherId) {
      const teacher = await prisma.teacher.findFirst({
        where: {
          id: validatedData.classTeacherId,
          schoolId: school.id,
          isActive: true,
        },
      });

      if (!teacher) {
        console.error(
          `[CLASS_CREATE] Teacher ${validatedData.classTeacherId} not found or inactive`,
        );
        return NextResponse.json(
          { error: "Teacher not found or inactive" },
          { status: 404 },
        );
      }
    }

    // Step 8: Check for duplicate class name in this academic year
    const existingClass = await prisma.class.findFirst({
      where: {
        name: validatedData.name,
        academicYearId: validatedData.academicYearId,
        schoolId: school.id,
      },
    });

    if (existingClass) {
      console.warn(
        `[CLASS_CREATE] Duplicate class name: ${validatedData.name} in academic year ${academicYear.name}`,
      );
      return NextResponse.json(
        {
          error: `A class named "${validatedData.name}" already exists in ${academicYear.name}`,
        },
        { status: 409 },
      );
    }

    console.log(
      `[CLASS_CREATE] Creating class "${validatedData.name}" for school ${school.id}`,
    );

    // Step 9: Create the class
    const newClass = await prisma.class.create({
      data: {
        name: validatedData.name,
        slug: slugify(validatedData.name),
        level: validatedData.level,
        capacity: validatedData.capacity || null,
        classTeacherId: validatedData.classTeacherId || null,
        academicYearId: validatedData.academicYearId,
        departmentId: validatedData.departmentId || null,
        schoolId: school.id,
        isActive: validatedData.isActive ?? true,
        isGraduatingClass: validatedData.isGraduatingClass ?? false,
        order: validatedData.order || null,
        nextPromotionClassId: validatedData.nextPromotionClassId || null,
      },
      include: {
        classTeacher: {
          include: {
            profile: true,
          },
        },
        academicYear: true,
      },
    });

    // Step 10: Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entityType: "Class",
        entityId: newClass.id,
        newValues: {
          capacity: newClass.capacity,
          academicYearId: newClass.academicYearId,
          classTeacherId: newClass.classTeacherId,
          departmentId: newClass.departmentId,
          schoolId: newClass.schoolId,
          isGraduatingClass: newClass.isGraduatingClass,
          order: newClass.order,
          nextPromotionClassId: newClass.nextPromotionClassId,
        },
      },
    });

    console.log(`[CLASS_CREATE] Successfully created class ${newClass.id}`);

    return NextResponse.json(newClass, { status: 201 });
  } catch (error) {
    console.error("[CLASS_CREATE] Error:", error);

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
// GET - List Classes
// ============================================================================

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
      select: { id: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const classes = await prisma.class.findMany({
      where: { schoolId: school.id },
      include: {
        classTeacher: {
          include: {
            profile: true,
          },
        },
        academicYear: true,
        department: true,
        _count: {
          select: {
            students: true,
            subjects: true,
            enrollments: true,
          },
        },
      },
      orderBy: [
        { academicYear: { startDate: "desc" } },
        { level: "asc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json(classes);
  } catch (error) {
    console.error("[CLASSES_GET] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
