// app/api/schools/[schoolSlug]/academic/overview/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    schoolSlug: string;
  }>;
};

// GET - Fetch academic overview data
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

    // Fetch school with academic data
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      include: {
        subjects: {
          where: { isActive: true },
          include: {
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
          },
        },
        departments: {
          where: { isActive: true },
          include: {
            headOfDept: {
              include: {
                profile: true,
              },
            },
            _count: {
              select: {
                subjects: true,
                teachersInDepartment: true,
              },
            },
          },
        },
        academicYears: {
          include: {
            terms: true,
            _count: {
              select: {
                classes: true,
              },
            },
          },
          orderBy: { startDate: "desc" },
          take: 3,
        },
        gradingSystems: {
          where: { isActive: true },
          include: {
            gradeScales: {
              orderBy: { minScore: "desc" },
            },
          },
        },
        _count: {
          select: {
            students: true,
            teachers: true,
            classes: true,
          },
        },
      },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Get current academic year and term from settings
    interface SchoolSettings {
      currentAcademicYearId?: string;
      currentTermId?: string;
    }

    const settings = (school.settings as SchoolSettings) || {};
    const currentYear = school.academicYears.find(
      (year) => year.id === settings.currentAcademicYearId,
    );
    const currentTerm = currentYear?.terms.find(
      (term) => term.id === settings.currentTermId,
    );

    // Build response
    const response = {
      school: {
        id: school.id,
        name: school.name,
        subdomain: school.subdomain,
      },
      stats: {
        subjects: school.subjects.length,
        departments: school.departments.length,
        teachers: school._count.teachers,
        students: school._count.students,
        classes: school._count.classes,
        academicYears: school.academicYears.length,
        gradingSystems: school.gradingSystems.length,
      },
      currentPeriod: {
        academicYear: currentYear
          ? {
              id: currentYear.id,
              name: currentYear.name,
              startDate: currentYear.startDate,
              endDate: currentYear.endDate,
            }
          : null,
        term: currentTerm
          ? {
              id: currentTerm.id,
              name: currentTerm.name,
              startDate: currentTerm.startDate,
              endDate: currentTerm.endDate,
            }
          : null,
      },
      topDepartments: school.departments.slice(0, 5).map((dept) => {
        const profile = dept.headOfDept?.profile;
        return {
          id: dept.id,
          name: dept.name,
          subjectsCount: dept._count.subjects,
          teachersCount: dept._count.teachersInDepartment,
          headOfDept:
            dept.headOfDept && profile
              ? {
                  id: dept.headOfDept.id,
                  firstName: profile.firstName,
                  lastName: profile.lastName,
                }
              : null,
        };
      }),
      recentAcademicYears: school.academicYears.slice(0, 5).map((year) => ({
        id: year.id,
        name: year.name,
        termsCount: year.terms.length,
        classesCount: year._count.classes,
        isCurrent: year.id === settings.currentAcademicYearId,
      })),
    };

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("[ACADEMIC_OVERVIEW_GET] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch academic overview",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
