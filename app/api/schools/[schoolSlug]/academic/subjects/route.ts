// app/api/schools/[schoolSlug]/academic/subjects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    schoolSlug: string;
  }>;
};

// GET - List all subjects for a school
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { schoolSlug } = params;

    // Check school access
    const role = getSchoolRole(session, schoolSlug);
    if (
      !session.isSuperAdmin &&
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get school
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: {
        id: true,
        organizationId: true,
      },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Fetch subjects with relationships
    const subjects = await prisma.subject.findMany({
      where: { schoolId: school.id },
      include: {
        department: true,
        teachers: {
          include: {
            teacher: {
              include: {
                profile: true,
              },
            },
          },
        },
        classSubjects: {
          include: {
            class: true,
          },
        },
        _count: {
          select: {
            teachers: true,
            classSubjects: true,
            assessmentScores: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Fetch departments for the form
    const departments = await prisma.department.findMany({
      where: {
        schoolId: school.id,
        isActive: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        subjects,
        departments,
        schoolId: school.id,
        organizationId: school.organizationId,
      },
    });
  } catch (error) {
    console.error("[SUBJECTS_GET] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch subjects",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
