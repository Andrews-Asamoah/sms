// app/api/schools/[schoolSlug]/announcements/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole, getActiveSchoolRole } from "@/lib/auth/school-access";

const announcementSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  target: z.string().min(1, "Target is required"), // Can be ALL, TEACHER, STUDENT, STAFF, CLASS:id, CLUB:id
  expiresAt: z.string().optional().nullable(),
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
    const isTeacher = role.effectiveRole === "teacher";
    const isAccountant = role.effectiveRole === "accountant";

    if (validatedData.target === "ALL" && !canSendToAll) {
      return NextResponse.json(
        { error: "Only admins can send announcements to all users" },
        { status: 403 },
      );
    }

    if (!canSendToAll && !isAccountant && !isTeacher) {
      return NextResponse.json(
        { error: "Unauthorized to send announcements" },
        { status: 403 },
      );
    }

    // Teachers can only send to specific classes or clubs they are involved in
    if (isTeacher && !canSendToAll) {
      if (validatedData.target.startsWith("CLASS:")) {
        const classId = validatedData.target.split(":")[1];
        // Check if teacher teaches this class
        const teacher = await prisma.teacher.findFirst({
          where: { profile: { userId: session.user.id }, schoolId: school.id }
        });
        const isClassTeacher = await prisma.class.findFirst({
             where: { id: classId, classTeacherId: teacher?.id }
        });
        const teachesSubject = await prisma.classSubject.findFirst({
             where: { classId, teacherId: teacher?.id }
        });
        
        if (!isClassTeacher && !teachesSubject) {
             return NextResponse.json({ error: "You can only send announcements to classes you teach" }, { status: 403 });
        }
      } else if (validatedData.target.startsWith("CLUB:")) {
        const clubId = validatedData.target.split(":")[1];
        const teacher = await prisma.teacher.findFirst({
          where: { profile: { userId: session.user.id }, schoolId: school.id }
        });
        const headsClub = await prisma.club.findFirst({
             where: { id: clubId, teacherInChargeId: teacher?.id }
        });
        if (!headsClub) {
             return NextResponse.json({ error: "You can only send announcements to clubs you head" }, { status: 403 });
        }
      } else if (["TEACHER", "STUDENT", "STAFF"].includes(validatedData.target)) {
        // Teachers might be allowed to send to all students/parents depending on policy, 
        // but let's keep it restricted to classes for now unless they are headteacher
      }
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
              : validatedData.target === "GUARDIAN"
                ? ["guardian"]
                : [];

    // Get relevant user IDs based on target roles
    // We use a more precise query to find users with the specific profile roles
    const memberQuery: any = {
       organization: { school: { id: school.id } }
    };

    if (validatedData.target !== "ALL") {
       memberQuery.OR = targetRoles.map(r => ({ role: { contains: r } }));
    }

    const members = await prisma.member.findMany({
      where: memberQuery,
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
    const role = await getActiveSchoolRole(session, schoolSlug);

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

    // Find user's class and club memberships for filtering
    const userId = session.user.id;
    const [enrollment, clubMemberships, guardianAdmissions] = await Promise.all([
      // As a student
      prisma.enrollment.findFirst({
        where: { student: { profile: { userId } }, status: "ACTIVE" },
        select: { classId: true }
      }),
      // As a student
      prisma.clubMember.findMany({
        where: { student: { profile: { userId } } },
        select: { clubId: true }
      }),
      // As a guardian
      role.effectiveRole === "guardian" 
        ? prisma.guardianStudent.findMany({
            where: { guardian: { profile: { userId } } },
            select: { 
              student: { 
                select: { 
                  enrollments: { where: { status: "ACTIVE" }, select: { classId: true } },
                  clubMembers: { select: { clubId: true } }
                } 
              } 
            }
          })
        : Promise.resolve([])
    ]);

    const userClassIds = new Set<string>();
    const userClubIds = new Set<string>();

    if (enrollment) userClassIds.add(enrollment.classId);
    clubMemberships.forEach(m => userClubIds.add(m.clubId));

    // Add ward's classes and clubs for guardians
    guardianAdmissions.forEach(ga => {
      ga.student.enrollments.forEach(e => userClassIds.add(e.classId));
      ga.student.clubMembers.forEach(cm => userClubIds.add(cm.clubId));
    });

    const announcements = await prisma.announcement.findMany({
      where: {
        schoolId: school.id,
        OR: [
          { target: "ALL" },
          { target: role.effectiveRole.toUpperCase() },
          { authorId: userId },
          ...Array.from(userClassIds).map(id => ({ target: `CLASS:${id}` })),
          ...Array.from(userClubIds).map(id => ({ target: `CLUB:${id}` }))
        ].filter(cond => Object.keys(cond).length > 0),
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

    // Fetch unique class and club IDs from announcements
    const classIdList = [...new Set(announcements.filter((a: any) => a.target.startsWith("CLASS:")).map((a: any) => a.target.split(":")[1]))];
    const clubIdList = [...new Set(announcements.filter((a: any) => a.target.startsWith("CLUB:")).map((a: any) => a.target.split(":")[1]))];

    // Fetch names in bulk
    const [classes, clubs] = await Promise.all([
      prisma.class.findMany({ where: { id: { in: classIdList as string[] } }, select: { id: true, name: true } }),
      prisma.club.findMany({ where: { id: { in: clubIdList as string[] } }, select: { id: true, name: true } })
    ]);

    const nameMap = new Map<string, string>();
    classes.forEach(c => nameMap.set(`CLASS:${c.id}`, `Class: ${c.name}`));
    clubs.forEach(c => nameMap.set(`CLUB:${c.id}`, `Club: ${c.name}`));

    const labelMap: Record<string, string> = {
      ALL: "Everyone",
      TEACHER: "Teachers",
      STUDENT: "Students & Parents",
      STAFF: "Staff",
      GUARDIAN: "Guardians"
    };

    const enhancedAnnouncements = announcements.map(a => ({
      ...a,
      targetName: nameMap.get(a.target) || labelMap[a.target] || a.target
    }));

    return NextResponse.json(enhancedAnnouncements);
  } catch (error) {
    console.error("[ANNOUNCEMENT_GET] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
