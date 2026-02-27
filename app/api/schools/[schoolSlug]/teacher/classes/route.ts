// app/api/schools/[schoolSlug]/teacher/classes/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (!role || role.effectiveRole !== "teacher") {
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
      where: {
        schoolId: school.id,
        classTeacher: {
          profile: {
            userId: session.user.id,
          },
        },
      },
      include: {
        academicYear: true,
      },
    });

    return NextResponse.json(classes);
  } catch (error) {
    console.error("[TEACHER_CLASSES_GET] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
