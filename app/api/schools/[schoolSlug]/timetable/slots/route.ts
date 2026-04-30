import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasSchoolAccess } from "@/lib/auth/school-access";
import { DayOfWeek } from "@/lib/generated/prisma/client";

const WEEKDAYS: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
];

async function getSchool(schoolSlug: string) {
  return prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true },
  });
}

/**
 * GET /api/schools/[schoolSlug]/timetable/slots
 * Query: ?departmentId=xxx — returns department-specific + school-wide slots
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  const { schoolSlug } = await params;
  const session = await getSession();
  if (!session || !hasSchoolAccess(session, schoolSlug)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const school = await getSchool(schoolSlug);
  if (!school)
    return NextResponse.json({ error: "School not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const departmentId = searchParams.get("departmentId");

  const where: any = { schoolId: school.id };
  if (departmentId) {
    where.OR = [{ departmentId }, { departmentId: null }];
  }

  const slots = await prisma.timeSlot.findMany({
    where,
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json(slots);
}

/**
 * POST /api/schools/[schoolSlug]/timetable/slots
 * Body can be either:
 *   { dayOfWeek, startTime, endTime, label, departmentId? }  — single slot
 *   { action: "generate", departmentIds?: string[], departmentId?: string, days?: DayOfWeek[] } — bulk-generate from templates
 *
 * When `departmentIds` has multiple entries, the generator fetches templates for each
 * department separately and creates slots scoped to that department.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  const { schoolSlug } = await params;
  const session = await getSession();
  if (!session || !hasSchoolAccess(session, schoolSlug)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const school = await getSchool(schoolSlug);
  if (!school)
    return NextResponse.json({ error: "School not found" }, { status: 404 });

  const body = await req.json();

  // ── Bulk-generate from PeriodTemplates ────────────────────────────────────
  if (body.action === "generate") {
    const days: DayOfWeek[] =
      Array.isArray(body.days) && body.days.length > 0 ? body.days : WEEKDAYS;

    // Support both plural (new) and singular (legacy) department fields
    const rawDeptIds: (string | null)[] =
      Array.isArray(body.departmentIds) && body.departmentIds.length > 0
        ? body.departmentIds
        : body.departmentId
          ? [body.departmentId]
          : [null]; // null = school-wide

    // Fetch templates for every requested scope and generate slots per scope
    let totalCreated = 0;
    const scopeLabels: string[] = [];

    for (const departmentId of rawDeptIds) {
      const templates = await prisma.periodTemplate.findMany({
        where: {
          schoolId: school.id,
          departmentId: departmentId ?? null,
        },
        orderBy: [{ sortOrder: "asc" }, { startTime: "asc" }],
      });

      if (templates.length === 0) {
        // Skip departments that have no templates defined — don't hard-fail
        continue;
      }

      const toCreate = days.flatMap((day) =>
        templates.map((t) => ({
          schoolId: school.id,
          departmentId: departmentId ?? null,
          dayOfWeek: day,
          startTime: t.startTime,
          endTime: t.endTime,
          label: t.name,
        })),
      );

      const result = await prisma.timeSlot.createMany({
        data: toCreate,
        skipDuplicates: true,
      });

      totalCreated += result.count;
      scopeLabels.push(departmentId ? `dept:${departmentId}` : "school-wide");
    }

    if (totalCreated === 0 && scopeLabels.length === 0) {
      return NextResponse.json(
        {
          error:
            "No period templates found for the selected departments. Define your periods first.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      created: totalCreated,
      message: `Generated ${totalCreated} time slot(s) across ${days.length} day(s) for ${rawDeptIds.length} department scope(s).`,
    });
  }

  // ── Single slot creation ──────────────────────────────────────────────────
  try {
    const { dayOfWeek, startTime, endTime, label, departmentId } = body;
    const slot = await prisma.timeSlot.create({
      data: {
        schoolId: school.id,
        departmentId: departmentId || null,
        dayOfWeek,
        startTime,
        endTime,
        label,
      },
    });
    return NextResponse.json(slot, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json(
        { error: "A slot with this day and time already exists" },
        { status: 409 },
      );
    }
    console.error("[SLOTS_POST]", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
