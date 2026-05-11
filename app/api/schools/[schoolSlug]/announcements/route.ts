// app/api/schools/[schoolSlug]/announcements/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole, getActiveSchoolRole } from "@/lib/auth/school-access";
import { sendSMS, htmlToPlainText, truncateSMS } from "@/lib/messaging/hubtel";
import { sendAnnouncementEmail } from "@/lib/email/resend";

const announcementSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().optional(), // Plain text (auto-derived if not provided)
  contentHtml: z.string().optional(), // Rich Tiptap HTML
  target: z.string().min(1, "Target is required"),
  targetId: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  messageType: z.enum(["ANNOUNCEMENT", "FINANCIAL"]).default("ANNOUNCEMENT"),
  sendSms: z.boolean().default(false),
  sendEmail: z.boolean().default(false),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await request.json();
    const validatedData = announcementSchema.parse(body);

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true, name: true, currency: true },
    });

    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

    // Derive plain text from HTML if not provided
    const plainContent = validatedData.content ||
      (validatedData.contentHtml ? htmlToPlainText(validatedData.contentHtml) : "");

    // Permission checks
    const canSendToAll = ["owner", "admin", "headteacher"].includes(role.effectiveRole) || session.isSuperAdmin;
    const isTeacher = role.effectiveRole === "teacher";
    const isAccountant = role.effectiveRole === "accountant";

    if (validatedData.target === "ALL" && !canSendToAll) {
      return NextResponse.json({ error: "Only admins can send to all users" }, { status: 403 });
    }
    if (!canSendToAll && !isAccountant && !isTeacher) {
      return NextResponse.json({ error: "Unauthorized to send announcements" }, { status: 403 });
    }

    // Build final target (CLASS:id, CLUB:id, etc.)
    let finalTarget = validatedData.target;
    if (validatedData.target === "CLASS" && validatedData.targetId) {
      finalTarget = `CLASS:${validatedData.targetId}`;
    } else if (validatedData.target === "CLUB" && validatedData.targetId) {
      finalTarget = `CLUB:${validatedData.targetId}`;
    }

    const announcement = await prisma.announcement.create({
      data: {
        schoolId: school.id,
        authorId: session.user.id,
        title: validatedData.title,
        content: plainContent,
        contentHtml: validatedData.contentHtml,
        target: finalTarget,
        messageType: validatedData.messageType,
        sendSms: validatedData.sendSms,
        sendEmail: validatedData.sendEmail,
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null,
      },
    });

    // --- In-App Notifications ---
    const targetRoles = getTargetRoles(finalTarget);
    const memberQuery: any = {
      organization: { school: { id: school.id } },
    };
    if (targetRoles.length > 0) {
      memberQuery.role = { in: targetRoles };
    }

    const members = await prisma.member.findMany({
      where: memberQuery,
      select: { userId: true, user: { select: { name: true, email: true } } },
    });

    if (members.length > 0) {
      await prisma.notification.createMany({
        data: members.map((m) => ({
          schoolId: school.id,
          userId: m.userId,
          title: `${validatedData.messageType === "FINANCIAL" ? "💰 Financial Notice" : "📢 Announcement"}: ${validatedData.title}`,
          message: plainContent.substring(0, 150),
          type: validatedData.messageType === "FINANCIAL" ? "FINANCIAL_MESSAGE" as const : "ANNOUNCEMENT" as const,
          isRead: false,
          link: `/${schoolSlug}/announcements`,
        })),
      });
    }

    // --- External delivery (fire-and-forget, never blocks response) ---
    if (validatedData.sendSms || validatedData.sendEmail) {
      deliverExternalMessages({
        members,
        title: validatedData.title,
        plainContent,
        contentHtml: validatedData.contentHtml || plainContent,
        sendSms: validatedData.sendSms,
        sendEmail: validatedData.sendEmail,
        schoolName: school.name,
        schoolSlug,
        announcementId: announcement.id,
        schoolId: school.id,
      }).catch((err) => console.error("[ANNOUNCEMENT] External delivery error:", err));
    }

    return NextResponse.json(announcement, { status: 201 });
  } catch (error) {
    console.error("[ANNOUNCEMENT_POST] Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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

    if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all";
    const search = searchParams.get("search") || "";
    const messageType = searchParams.get("messageType") || "";

    const userId = session.user.id;

    const [enrollment, clubMemberships, guardianAdmissions] = await Promise.all([
      prisma.enrollment.findFirst({
        where: { student: { profile: { userId } }, status: "ACTIVE" },
        select: { classId: true },
      }),
      prisma.clubMember.findMany({
        where: { student: { profile: { userId } } },
        select: { clubId: true },
      }),
      role.effectiveRole === "guardian"
        ? prisma.guardianStudent.findMany({
            where: { guardian: { profile: { userId } } },
            select: {
              student: {
                select: {
                  enrollments: { where: { status: "ACTIVE" }, select: { classId: true } },
                  clubMembers: { select: { clubId: true } },
                },
              },
            },
          })
        : Promise.resolve([]),
    ]);

    const userClassIds = new Set<string>();
    const userClubIds = new Set<string>();
    if (enrollment) userClassIds.add(enrollment.classId);
    clubMemberships.forEach((m) => userClubIds.add(m.clubId));
    guardianAdmissions.forEach((ga) => {
      ga.student.enrollments.forEach((e) => userClassIds.add(e.classId));
      ga.student.clubMembers.forEach((cm) => userClubIds.add(cm.clubId));
    });

    const now = new Date();
    const whereConditions: any = {
      schoolId: school.id,
      OR: [
        { target: "ALL" },
        { target: role.effectiveRole.toUpperCase() },
        { authorId: userId },
        ...Array.from(userClassIds).map((id) => ({ target: `CLASS:${id}` })),
        ...Array.from(userClubIds).map((id) => ({ target: `CLUB:${id}` })),
      ].filter((cond) => Object.keys(cond).length > 0),
    };

    if (filter === "active") whereConditions.AND = [{ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }];
    if (filter === "expired") whereConditions.AND = [{ expiresAt: { lte: now } }];
    if (search) whereConditions.title = { contains: search, mode: "insensitive" };
    if (messageType) whereConditions.messageType = messageType;

    const announcements = await prisma.announcement.findMany({
      where: whereConditions,
      include: {
        author: { select: { name: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Enrich target names
    const classIdList = [...new Set(announcements.filter((a) => a.target.startsWith("CLASS:")).map((a) => a.target.split(":")[1]))];
    const clubIdList = [...new Set(announcements.filter((a) => a.target.startsWith("CLUB:")).map((a) => a.target.split(":")[1]))];

    const [classes, clubs] = await Promise.all([
      prisma.class.findMany({ where: { id: { in: classIdList } }, select: { id: true, name: true } }),
      prisma.club.findMany({ where: { id: { in: clubIdList } }, select: { id: true, name: true } }),
    ]);

    const nameMap = new Map<string, string>();
    classes.forEach((c) => nameMap.set(`CLASS:${c.id}`, `Class: ${c.name}`));
    clubs.forEach((c) => nameMap.set(`CLUB:${c.id}`, `Club: ${c.name}`));

    const labelMap: Record<string, string> = {
      ALL: "Everyone",
      TEACHER: "Teachers",
      STUDENT: "Students & Parents",
      STAFF: "Staff",
      GUARDIAN: "Guardians",
      ACCOUNTANT: "Accountants",
    };

    const enhanced = announcements.map((a) => ({
      ...a,
      targetName: nameMap.get(a.target) || labelMap[a.target] || a.target,
    }));

    return NextResponse.json(enhanced);
  } catch (error) {
    console.error("[ANNOUNCEMENT_GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTargetRoles(target: string): string[] {
  if (target === "ALL") return ["owner", "admin", "headteacher", "teacher", "accountant", "student", "guardian", "staff"];
  if (target === "TEACHER") return ["teacher"];
  if (target === "STUDENT") return ["student", "guardian"];
  if (target === "STAFF") return ["staff"];
  if (target === "GUARDIAN") return ["guardian"];
  return [];
}

async function deliverExternalMessages(opts: {
  members: { userId: string; user: { name: string; email: string } }[];
  title: string;
  plainContent: string;
  contentHtml: string;
  sendSms: boolean;
  sendEmail: boolean;
  schoolName: string;
  schoolSlug: string;
  announcementId: string;
  schoolId: string;
}) {
  const { members, title, plainContent, contentHtml, sendSms, sendEmail, schoolName, schoolSlug } = opts;

  // Get user profiles for phone numbers
  const userIds = members.map((m) => m.userId);
  const profiles = await prisma.userProfile.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, phone: true },
  });
  const phoneMap = new Map(profiles.map((p) => [p.userId, p.phone]));

  const smsText = truncateSMS(`[${schoolName}] ${title}: ${plainContent}`);
  let smsCount = 0;
  let emailCount = 0;

  await Promise.allSettled(
    members.map(async (m) => {
      const phone = phoneMap.get(m.userId);
      const email = m.user.email;

      if (sendSms && phone) {
        const result = await sendSMS(phone, smsText);
        if (result.success) smsCount++;
      }

      if (sendEmail && email) {
        const result = await sendAnnouncementEmail({
          to: email,
          recipientName: m.user.name,
          subject: title,
          contentHtml,
          schoolName,
          schoolSlug,
        });
        if (result.success) emailCount++;
      }
    })
  );

  // Update delivery counts
  await prisma.announcement.update({
    where: { id: opts.announcementId },
    data: { smsCount, emailCount },
  });
}
