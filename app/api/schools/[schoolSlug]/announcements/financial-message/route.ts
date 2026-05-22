// app/api/schools/[schoolSlug]/announcements/financial-message/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { sendSMS, htmlToPlainText, truncateSMS } from "@/lib/messaging/hubtel";
import { sendFeeReminderEmail } from "@/lib/email/resend";

const schema = z.object({
  studentIds: z.array(z.string()).min(1, "Select at least one student"),
  subject: z.string().min(1, "Subject is required"),
  contentHtml: z.string().min(1, "Message content is required"),
  channels: z.array(z.enum(["sms", "email", "inApp"])).min(1, "Select at least one channel"),
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

    const canSend = ["owner", "admin", "accountant", "headteacher"].includes(role.effectiveRole) || session.isSuperAdmin;
    if (!canSend) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await request.json();
    const data = schema.parse(body);

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true, name: true, currency: true, settings: true },
    });
    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

    const plainContent = htmlToPlainText(data.contentHtml);

    // Fetch students with GuardianStudent → Guardian chain
    const studentGuardians = await prisma.guardianStudent.findMany({
      where: {
        studentId: { in: data.studentIds },
        receiveAlerts: true,
        guardian: { schoolId: school.id, isActive: true },
      },
      select: {
        receiveAlerts: true,
        student: {
          select: {
            id: true,
            studentId: true,
            outstandingBalance: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
        guardian: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            profile: { select: { userId: true } },
          },
        },
      },
    });

    // Create the announcement record
    const announcement = await prisma.announcement.create({
      data: {
        schoolId: school.id,
        authorId: session.user.id,
        title: data.subject,
        content: plainContent.substring(0, 300),
        contentHtml: data.contentHtml,
        target: "GUARDIAN",
        messageType: "FINANCIAL",
        sendSms: data.channels.includes("sms"),
        sendEmail: data.channels.includes("email"),
      },
    });

    const results = {
      totalStudents: data.studentIds.length,
      totalGuardians: 0,
      smsSent: 0,
      emailSent: 0,
      inAppSent: 0,
      smsFailed: 0,
      emailFailed: 0,
    };

    const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${schoolSlug}/guardian`;

    // Deduplicate guardians (a guardian may have multiple wards in the selection)
    const processedGuardians = new Set<string>();

    for (const gs of studentGuardians) {
      const { student, guardian } = gs;
      const studentName = `${student.profile?.firstName ?? ""} ${student.profile?.lastName ?? ""}`.trim();
      const balance = Number(student.outstandingBalance ?? 0);
      const guardianName = `${guardian.firstName} ${guardian.lastName}`;

      // In-App Notification (one per guardian per student)
      if (data.channels.includes("inApp") && guardian.profile?.userId) {
        await prisma.notification.create({
          data: {
            schoolId: school.id,
            userId: guardian.profile.userId,
            title: `💰 Financial Notice: ${data.subject}`,
            message: plainContent.substring(0, 150),
            type: "FINANCIAL_MESSAGE",
            isRead: false,
            link: `/${schoolSlug}/guardian`,
          },
        });
        results.inAppSent++;
      }

      // Deduplicate SMS/Email (send once per guardian even if they have multiple selected wards)
      if (!processedGuardians.has(guardian.id)) {
        processedGuardians.add(guardian.id);
        results.totalGuardians++;

        // SMS
        if (data.channels.includes("sms") && guardian.phone) {
          const smsBody = truncateSMS(
            `[${school.name}] ${data.subject}\n${studentName}: ${school.currency} ${balance.toFixed(2)} outstanding.\n${plainContent.substring(0, 80)}`
          );
          const smsResult = await sendSMS(guardian.phone, smsBody, school.settings as any);
          if (smsResult.success) results.smsSent++;
          else results.smsFailed++;
        }

        // Email
        if (data.channels.includes("email") && guardian.email) {
          const emailResult = await sendFeeReminderEmail({
            to: guardian.email,
            guardianName,
            studentName,
            studentId: student.studentId,
            outstandingBalance: balance,
            currency: school.currency,
            installmentLabel: "Financial Notice",
            dueDate: new Date(),
            schoolName: school.name,
            contentHtml: data.contentHtml,
            portalUrl,
          });
          if (emailResult.success) results.emailSent++;
          else results.emailFailed++;
        }
      }
    }

    await prisma.announcement.update({
      where: { id: announcement.id },
      data: { smsCount: results.smsSent, emailCount: results.emailSent },
    });

    return NextResponse.json({ success: true, announcementId: announcement.id, results });
  } catch (error) {
    console.error("[FINANCIAL_MESSAGE] Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
