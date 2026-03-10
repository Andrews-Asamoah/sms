import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import * as z from "zod";

const updateClubSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().nullable().optional(),
  teacherInChargeId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; clubId: string }> }
) {
  try {
    const { schoolSlug, clubId } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner" &&
      !session.isSuperAdmin
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const data = updateClubSchema.parse(body);

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const club = await prisma.club.update({
      where: { id: clubId, schoolId: school.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.teacherInChargeId !== undefined && { teacherInChargeId: data.teacherInChargeId }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        teacherInCharge: { include: { profile: true } },
        _count: { select: { members: true } },
      },
    });

    return NextResponse.json(club);
  } catch (error) {
    console.error("❌ Error updating club:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update club" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; clubId: string }> }
) {
  try {
    const { schoolSlug, clubId } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner" &&
      !session.isSuperAdmin
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Delete members first, then the club
    await prisma.$transaction([
      prisma.clubMember.deleteMany({ where: { clubId } }),
      prisma.club.delete({ where: { id: clubId, schoolId: school.id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error deleting club:", error);
    return NextResponse.json({ error: "Failed to delete club" }, { status: 500 });
  }
}
