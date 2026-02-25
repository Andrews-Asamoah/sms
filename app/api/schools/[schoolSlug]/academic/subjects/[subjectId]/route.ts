// app/api/schools/[schoolSlug]/academic/subjects/[subjectId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    schoolSlug: string;
    subjectId: string;
  }>;
};

// GET - Fetch single subject with details
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { schoolSlug, subjectId } = params;

    // Check school access
    const role = getSchoolRole(session, schoolSlug);
    if (
      !session.isSuperAdmin &&
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch subject with detailed relationships
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: {
        school: {
          include: {
            organization: true,
            departments: {
              where: { isActive: true },
              orderBy: { name: "asc" },
            },
            teachers: {
              where: { isActive: true },
              include: {
                profile: true,
              },
              orderBy: {
                profile: {
                  firstName: "asc",
                },
              },
            },
          },
        },
        departments: true,
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
            class: {
              include: {
                academicYear: true,
              },
            },
          },
          orderBy: {
            class: {
              level: "asc",
            },
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
    });

    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    // Check if subject belongs to this school
    if (subject.school.subdomain !== schoolSlug) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Group class subjects by level
    const classesByLevel = subject.classSubjects.reduce(
      (acc, cs) => {
        const level = cs.class.level;
        if (!acc[level]) {
          acc[level] = [];
        }
        acc[level].push(cs);
        return acc;
      },
      {} as Record<string, typeof subject.classSubjects>,
    );

    return NextResponse.json({
      success: true,
      data: {
        subject,
        classesByLevel,
        availableTeachers: subject.school.teachers.filter(
          (t) => !subject.teachers.some((st) => st.teacherId === t.id),
        ),
      },
    });
  } catch (error) {
    console.error("[SUBJECT_DETAIL_GET] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch subject details",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
