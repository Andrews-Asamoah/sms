import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { revalidatePath } from "next/cache";

const announcementUpdateSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  content: z.string().min(1, "Content is required").optional(),
  target: z.enum(["ALL", "TEACHER", "STUDENT", "STAFF"]).optional(),
  expiresAt: z.string().optional().nullable(),
});

export async function PUT(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ schoolSlug: string; announcementId: string }> },
) {
  try {
    const { schoolSlug, announcementId } = await params;
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

    const existingAnnouncement = await prisma.announcement.findUnique({
      where: { id: announcementId, schoolId: school.id },
    });

    if (!existingAnnouncement) {
      return NextResponse.json(
        { error: "Announcement not found" },
        { status: 404 },
      );
    }

    const canEdit =
      ["owner", "admin", "headteacher"].includes(role.effectiveRole) ||
      session.isSuperAdmin ||
      existingAnnouncement.authorId === session.user.id;

    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = announcementUpdateSchema.parse(body);

    const updatedAnnouncement = await prisma.announcement.update({
      where: { id: announcementId },
      data: {
        ...(validatedData.title && { title: validatedData.title }),
        ...(validatedData.content && { content: validatedData.content }),
        ...(validatedData.target && { target: validatedData.target }),
        ...(validatedData.expiresAt !== undefined && {
          expiresAt: validatedData.expiresAt
            ? new Date(validatedData.expiresAt)
            : null,
        }),
      },
    });

    // Invalidate cache
    revalidatePath(`/${schoolSlug}/admin/announcements`);
    revalidatePath(`/${schoolSlug}/teacher/announcements`);
    revalidatePath(`/${schoolSlug}/student/announcements`);
    revalidatePath(`/${schoolSlug}/guardian/announcements`);

    return NextResponse.json(updatedAnnouncement);
  } catch (error) {
    console.error("[ANNOUNCEMENT_PUT] Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ schoolSlug: string; announcementId: string }> },
) {
  try {
    const { schoolSlug, announcementId } = await params;
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

    const existingAnnouncement = await prisma.announcement.findUnique({
      where: { id: announcementId, schoolId: school.id },
    });

    if (!existingAnnouncement) {
      return NextResponse.json(
        { error: "Announcement not found" },
        { status: 404 },
      );
    }

    const canDelete =
      ["owner", "admin", "headteacher"].includes(role.effectiveRole) ||
      session.isSuperAdmin ||
      existingAnnouncement.authorId === session.user.id;

    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.announcement.delete({
      where: { id: announcementId },
    });

    // Invalidate cache
    revalidatePath(`/${schoolSlug}/admin/announcements`);
    revalidatePath(`/${schoolSlug}/teacher/announcements`);
    revalidatePath(`/${schoolSlug}/student/announcements`);
    revalidatePath(`/${schoolSlug}/guardian/announcements`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ANNOUNCEMENT_DELETE] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
