// app/api/schools/[schoolSlug]/fee-reminders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";

const installmentSchema = z.object({
  label: z.string().min(1),
  dueDate: z.string(), // ISO date string
  sendDate: z.string(), // ISO date string
});

const scheduleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  sendSms: z.boolean().default(true),
  sendEmail: z.boolean().default(true),
  sendInApp: z.boolean().default(true),
  messageTemplate: z.string().min(1, "Message template is required"),
  smsTemplate: z.string().optional(),
  targetOutstandingOnly: z.boolean().default(true),
  minimumOutstanding: z.number().default(0),
  academicYearId: z.string().optional(),
  termId: z.string().optional(),
  installments: z.array(installmentSchema).min(1).max(3),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const canAccess = ["owner", "admin", "accountant", "headteacher"].includes(role.effectiveRole) || session.isSuperAdmin;
    if (!canAccess) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });
    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

    const schedules = await prisma.feeReminderSchedule.findMany({
      where: { schoolId: school.id },
      include: {
        installments: { orderBy: { dueDate: "asc" } },
        createdBy: { select: { name: true } },
        _count: { select: { logs: true } },
        academicYear: { select: { name: true } },
        term: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(schedules);
  } catch (error) {
    console.error("[FEE_REMINDERS_GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const canCreate = ["owner", "admin", "accountant", "headteacher"].includes(role.effectiveRole) || session.isSuperAdmin;
    if (!canCreate) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const body = await request.json();
    const data = scheduleSchema.parse(body);

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });
    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

    const schedule = await prisma.feeReminderSchedule.create({
      data: {
        schoolId: school.id,
        createdById: session.user.id,
        name: data.name,
        description: data.description,
        sendSms: data.sendSms,
        sendEmail: data.sendEmail,
        sendInApp: data.sendInApp,
        messageTemplate: data.messageTemplate,
        smsTemplate: data.smsTemplate,
        targetOutstandingOnly: data.targetOutstandingOnly,
        minimumOutstanding: data.minimumOutstanding,
        academicYearId: data.academicYearId || null,
        termId: data.termId || null,
        installments: {
          create: data.installments.map((inst) => ({
            label: inst.label,
            dueDate: new Date(inst.dueDate),
            sendDate: new Date(inst.sendDate),
          })),
        },
      },
      include: {
        installments: { orderBy: { dueDate: "asc" } },
      },
    });

    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    console.error("[FEE_REMINDERS_POST] Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
