// app/api/schools/[schoolSlug]/fee-reminders/[scheduleId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { sendSMS, truncateSMS } from "@/lib/messaging/hubtel";
import { sendFeeReminderEmail } from "@/lib/email/resend";

type Params = { params: Promise<{ schoolSlug: string; scheduleId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { schoolSlug, scheduleId } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);
    if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const school = await prisma.school.findUnique({ where: { subdomain: schoolSlug }, select: { id: true } });
    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

    const schedule = await prisma.feeReminderSchedule.findFirst({
      where: { id: scheduleId, schoolId: school.id },
      include: {
        installments: { orderBy: { dueDate: "asc" } },
        logs: { orderBy: { sentAt: "desc" }, take: 100 },
        createdBy: { select: { name: true } },
        academicYear: { select: { name: true } },
        term: { select: { name: true } },
      },
    });

    if (!schedule) return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    return NextResponse.json(schedule);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { schoolSlug, scheduleId } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);
    if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const school = await prisma.school.findUnique({ where: { subdomain: schoolSlug }, select: { id: true } });
    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

    const body = await request.json();
    const schedule = await prisma.feeReminderSchedule.update({
      where: { id: scheduleId, schoolId: school.id },
      data: {
        name: body.name,
        description: body.description,
        isActive: body.isActive,
        sendSms: body.sendSms,
        sendEmail: body.sendEmail,
        sendInApp: body.sendInApp,
        messageTemplate: body.messageTemplate,
        smsTemplate: body.smsTemplate,
        targetOutstandingOnly: body.targetOutstandingOnly,
        minimumOutstanding: body.minimumOutstanding,
      },
      include: { installments: { orderBy: { dueDate: "asc" } } },
    });

    return NextResponse.json(schedule);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { schoolSlug, scheduleId } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);
    if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const school = await prisma.school.findUnique({ where: { subdomain: schoolSlug }, select: { id: true } });
    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

    await prisma.feeReminderSchedule.delete({ where: { id: scheduleId, schoolId: school.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /[scheduleId] — manual trigger for testing
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { schoolSlug, scheduleId } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);
    if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const canTrigger =
      ["owner", "admin", "accountant", "headteacher"].includes(role.effectiveRole) ||
      session.isSuperAdmin;
    if (!canTrigger) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true, name: true, currency: true, settings: true },
    });
    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

    const schedule = await prisma.feeReminderSchedule.findFirst({
      where: { id: scheduleId, schoolId: school.id },
      include: { installments: { orderBy: { dueDate: "asc" } } },
    });
    if (!schedule) return NextResponse.json({ error: "Schedule not found" }, { status: 404 });

    const mockInstallment = schedule.installments[0] ?? {
      id: null,
      label: "Manual Trigger",
      dueDate: new Date(),
    };

    const result = await processReminderSend({
      schedule,
      installment: mockInstallment,
      school: { id: school.id, name: school.name, currency: school.currency, settings: school.settings },
      schoolSlug,
      isManual: true,
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("[FEE_REMINDER_TRIGGER] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── Shared processing logic (also used by the daily cron job) ───────────────

export async function processReminderSend(opts: {
  schedule: {
    id: string;
    sendSms: boolean;
    sendEmail: boolean;
    sendInApp: boolean;
    targetOutstandingOnly: boolean;
    minimumOutstanding: any;
    termId?: string | null;
    messageTemplate: string;
    smsTemplate?: string | null;
  };
  installment: { id: string | null; label: string; dueDate: Date };
  school: { id: string; name: string; currency: string; settings?: any };
  schoolSlug: string;
  isManual?: boolean;
}) {
  const { schedule, installment, school, schoolSlug, isManual } = opts;
  const dueDate = installment.dueDate instanceof Date ? installment.dueDate : new Date(installment.dueDate);

  // Query via GuardianStudent join — receiveAlerts lives on the join table
  const guardianStudentWhere: any = {
    receiveAlerts: true,
    guardian: { schoolId: school.id, isActive: true },
    student: { schoolId: school.id, status: "ACTIVE" },
  };

  if (schedule.targetOutstandingOnly) {
    guardianStudentWhere.student.outstandingBalance = {
      gt: Number(schedule.minimumOutstanding ?? 0),
    };
  }

  if (schedule.termId) {
    guardianStudentWhere.student.bills = {
      some: { termId: schedule.termId, status: { in: ["PENDING", "PARTIALLY_PAID"] } },
    };
  }

  const guardianStudents = await prisma.guardianStudent.findMany({
    where: guardianStudentWhere,
    select: {
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

  const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${schoolSlug}/guardian`;
  const logs: {
    guardianId: string;
    guardianName: string;
    guardianPhone?: string;
    guardianEmail?: string;
    studentName: string;
    outstandingBalance: number;
    channel: string;
    status: string;
    error?: string;
  }[] = [];
  let smsSent = 0;
  let emailSent = 0;
  let inAppSent = 0;

  // Track which guardians have already received SMS/email (dedup across multiple wards)
  const smsEmailProcessed = new Set<string>();

  for (const gs of guardianStudents) {
    const { student, guardian } = gs;
    const studentName =
      `${student.profile?.firstName ?? ""} ${student.profile?.lastName ?? ""}`.trim();
    const balance = Number(student.outstandingBalance ?? 0);
    const guardianName = `${guardian.firstName} ${guardian.lastName}`;
    const dueDateStr = dueDate.toLocaleDateString("en-GH", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const personalizedHtml = schedule.messageTemplate
      .replaceAll("{{studentName}}", studentName)
      .replaceAll("{{outstandingBalance}}", `${school.currency} ${balance.toFixed(2)}`)
      .replaceAll("{{dueDate}}", dueDateStr)
      .replaceAll("{{installmentLabel}}", installment.label);

    const defaultSms = `[${school.name}] ${installment.label}: ${studentName} has ${school.currency} ${balance.toFixed(2)} outstanding due ${dueDate.toLocaleDateString("en-GH")}. Contact accounts office.`;
    const personalizedSMS = truncateSMS(
      (schedule.smsTemplate ?? defaultSms)
        .replaceAll("{{studentName}}", studentName)
        .replaceAll("{{outstandingBalance}}", `${school.currency} ${balance.toFixed(2)}`)
        .replaceAll("{{dueDate}}", dueDate.toLocaleDateString("en-GH"))
        .replaceAll("{{installmentLabel}}", installment.label)
    );

    // ── In-App (one per student-guardian pair) ──
    if (schedule.sendInApp && guardian.profile?.userId) {
      try {
        await prisma.notification.create({
          data: {
            schoolId: school.id,
            userId: guardian.profile.userId,
            title: `💰 ${installment.label} Fee Reminder`,
            message: `${studentName} has ${school.currency} ${balance.toFixed(2)} outstanding. Due: ${dueDateStr}`,
            type: "FEE_REMINDER",
            isRead: false,
            link: `/${schoolSlug}/guardian`,
          },
        });
        inAppSent++;
        logs.push({ guardianId: guardian.id, guardianName, studentName, outstandingBalance: balance, channel: "IN_APP", status: "SENT" });
      } catch (e) {
        logs.push({ guardianId: guardian.id, guardianName, studentName, outstandingBalance: balance, channel: "IN_APP", status: "FAILED", error: String(e) });
      }
    }

    // ── SMS & Email (deduplicated per guardian) ──
    if (!smsEmailProcessed.has(guardian.id)) {
      smsEmailProcessed.add(guardian.id);

      if (schedule.sendSms && guardian.phone) {
        const smsResult = await sendSMS(guardian.phone, personalizedSMS, school.settings);
        if (smsResult.success) smsSent++;
        logs.push({ guardianId: guardian.id, guardianName, guardianPhone: guardian.phone, studentName, outstandingBalance: balance, channel: "SMS", status: smsResult.success ? "SENT" : "FAILED", error: smsResult.error });
      }

      if (schedule.sendEmail && guardian.email) {
        const emailResult = await sendFeeReminderEmail({
          to: guardian.email,
          guardianName,
          studentName,
          studentId: student.studentId,
          outstandingBalance: balance,
          currency: school.currency,
          installmentLabel: installment.label,
          dueDate,
          schoolName: school.name,
          contentHtml: personalizedHtml,
          portalUrl,
        });
        if (emailResult.success) emailSent++;
        logs.push({ guardianId: guardian.id, guardianName, guardianEmail: guardian.email, studentName, outstandingBalance: balance, channel: "EMAIL", status: emailResult.success ? "SENT" : "FAILED", error: emailResult.error });
      }
    }
  }

  // Persist logs
  if (logs.length > 0) {
    await prisma.feeReminderLog.createMany({
      data: logs.map((l) => ({
        scheduleId: schedule.id,
        installmentId: installment.id ?? null,
        guardianName: l.guardianName,
        guardianPhone: l.guardianPhone ?? null,
        guardianEmail: l.guardianEmail ?? null,
        studentName: l.studentName,
        studentId: l.guardianId,
        outstandingBalance: l.outstandingBalance,
        channel: l.channel as any,
        status: l.status as any,
        error: l.error ?? null,
      })),
    });
  }

  // Mark installment sent (skip for manual triggers)
  if (!isManual && installment.id) {
    await prisma.feeReminderInstallment.update({
      where: { id: installment.id },
      data: { sent: true, sentAt: new Date() },
    });
  }

  return {
    guardianStudents: guardianStudents.length,
    smsSent,
    emailSent,
    inAppSent,
    logs: logs.length,
  };
}
