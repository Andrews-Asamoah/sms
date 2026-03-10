import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import * as z from "zod";

const clubSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  teacherInChargeId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;
    await requireSchoolAccess(schoolSlug);

    const body = await request.json();
    const data = clubSchema.parse(body);

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const club = await prisma.club.create({
      data: {
        schoolId: school.id,
        name: data.name,
        description: data.description,
        teacherInChargeId: data.teacherInChargeId || null,
        isActive: data.isActive,
      },
      include: {
        teacherInCharge: {
          include: {
            profile: {
              include: {
                user: {
                  select: {
                    image: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: { members: true },
        },
      },
    });

    return NextResponse.json(club);
  } catch (error) {
    console.error("❌ Error creating club:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to create club" },
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
    await requireSchoolAccess(schoolSlug);

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const clubs = await prisma.club.findMany({
      where: { schoolId: school.id },
      include: {
        teacherInCharge: {
          include: {
            profile: {
              include: {
                user: {
                  select: {
                    image: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: { members: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(clubs);
  } catch (error) {
    console.error("❌ Error fetching clubs:", error);
    return NextResponse.json(
      { error: "Failed to fetch clubs" },
      { status: 500 },
    );
  }
}
