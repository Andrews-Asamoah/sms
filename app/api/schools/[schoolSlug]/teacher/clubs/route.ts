import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyApiSchoolAccess } from "@/lib/auth/guards";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  const { schoolSlug } = await params;
  const access = await verifyApiSchoolAccess(schoolSlug, ["teacher"]);
  if (!access.authorized) return access.errorResponse;
  const { session } = access;

  try {
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Find teacher profile for the current user
    const teacher = await prisma.teacher.findFirst({
      where: {
        schoolId: school.id,
        profile: {
          userId: session.user.id
        }
      },
      select: { id: true }
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
    }

    const clubs = await prisma.club.findMany({
      where: {
        schoolId: school.id,
        teacherInChargeId: teacher.id,
        isActive: true
      },
      select: { id: true, name: true }
    });

    return NextResponse.json(clubs);
  } catch (error) {
    console.error("[TEACHER_CLUBS_GET]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
