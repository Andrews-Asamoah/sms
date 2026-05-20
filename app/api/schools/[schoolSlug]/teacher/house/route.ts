// app/api/schools/[schoolSlug]/teacher/house/route.ts
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

    // Find teacher profile for the current user and their assigned house
    const house = await prisma.house.findFirst({
      where: {
        schoolId: school.id,
        houseTeacher: {
          profile: {
            userId: session.user.id
          }
        }
      },
      include: {
        _count: {
          select: {
            students: true,
            teachersInHouse: true
          }
        },
        students: {
          take: 50,
          include: {
            profile: true,
            class: {
              select: { name: true }
            }
          }
        }
      }
    });

    if (!house) {
      return NextResponse.json({ error: "No house assigned to this teacher" }, { status: 404 });
    }

    return NextResponse.json(house);
  } catch (error) {
    console.error("[TEACHER_HOUSE_GET]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
