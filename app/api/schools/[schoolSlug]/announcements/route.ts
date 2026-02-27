// app/api/schools/[schoolSlug]/announcements/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";

const announcementSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  target: z.enum(["ALL", "TEACHER", "STUDENT", "STAFF"]),
  expiresAt: z.string().optional(),
});

export async function POST(
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

    const body = await request.json();
    const validatedData = announcementSchema.parse(body);

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Permission check
    const canSendToAll =
      ["owner", "admin", "headteacher"].includes(role.effectiveRole) ||
      session.isSuperAdmin;
    const isAccountant = role.effectiveRole === "accountant";

    if (validatedData.target === "ALL" && !canSendToAll) {
      return NextResponse.json(
        { error: "Only admins can send announcements to all users" },
        { status: 403 },
      );
    }

    if (isAccountant && validatedData.target === "ALL") {
      return NextResponse.json(
        { error: "Accountants can only target specific groups" },
        { status: 403 },
      );
    }

    if (!canSendToAll && !isAccountant) {
      return NextResponse.json(
        { error: "Unauthorized to send announcements" },
        { status: 403 },
      );
    }

    const announcement = await prisma.announcement.create({
      data: {
        schoolId: school.id,
        authorId: session.user.id,
        title: validatedData.title,
        content: validatedData.content,
        target: validatedData.target,
        expiresAt: validatedData.expiresAt
          ? new Date(validatedData.expiresAt)
          : null,
      },
    });

    // Create notifications for targeted users
    // This is simplified; in a real app, this might be a background job
    const targetRoles =
      validatedData.target === "ALL"
        ? [
            "owner",
            "admin",
            "headteacher",
            "teacher",
            "accountant",
            "student",
            "guardian",
            "staff",
          ]
        : validatedData.target === "TEACHER"
          ? ["teacher"]
          : validatedData.target === "STUDENT"
            ? ["student", "guardian"]
            : validatedData.target === "STAFF"
              ? ["staff"]
              : [];

    const members = await prisma.member.findMany({
      where: {
        organizationId: (
          await prisma.organization.findFirst({
            where: { school: { id: school.id } },
          })
        )?.id as string,
        role: { in: targetRoles },
      },
      select: { userId: true },
    });

    if (members.length > 0) {
      await prisma.notification.createMany({
        data: members.map((m) => ({
          schoolId: school.id,
          userId: m.userId,
          title: `Announcement: ${validatedData.title}`,
          message: validatedData.content.substring(0, 100),
          type: "ANNOUNCEMENT",
          isRead: false,
          link: `/${schoolSlug}/announcements`,
        })),
      });
    }

    return NextResponse.json(announcement, { status: 201 });
  } catch (error) {
    console.error("[ANNOUNCEMENT_POST] Error:", error);
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

    const announcements = await prisma.announcement.findMany({
      where: {
        schoolId: school.id,
        OR: [
          { target: "ALL" },
          { target: role.effectiveRole.toUpperCase() },
          { authorId: session.user.id },
        ],
      },
      include: {
        author: {
          select: { name: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });

    return NextResponse.json(announcements);
  } catch (error) {
    console.error("[ANNOUNCEMENT_GET] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
