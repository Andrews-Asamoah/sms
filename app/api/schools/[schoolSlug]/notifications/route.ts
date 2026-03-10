// app/api/schools/[schoolSlug]/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;
    const session = await requireSchoolAccess(schoolSlug);

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const { getActiveSchoolRole } = await import("@/lib/auth/school-access");
    const activeRole = await getActiveSchoolRole(session, schoolSlug);
    const role = activeRole?.effectiveRole || "user";

    // Role-based filtering logic
    const where: any = {
      schoolId: school.id,
      userId: session.user.id,
    };

    // Filter by type or other metadata based on role
    if (role === "guardian") {
      where.type = {
        in: ["FEE_REMINDER", "ONLINE_PAYMENT", "ANNOUNCEMENT", "RESULT_PUBLISHED", "GENERAL"],
      };
    } else if (role === "teacher") {
      where.type = {
        in: ["GENERAL", "ANNOUNCEMENT", "ATTENDANCE_ALERT"],
      };
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        ...where,
        isRead: false,
      },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error("[NOTIFICATIONS_GET] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const { notificationId } = await request.json();

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!notificationId || !school) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    await prisma.notification.update({
      where: {
        id: notificationId,
        userId: session.user.id,
        schoolId: school.id,
      },
      data: {
        isRead: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[NOTIFICATIONS_PATCH] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;
    const session = await requireSchoolAccess(schoolSlug);

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        schoolId: school.id,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[NOTIFICATIONS_PUT] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
