import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasSchoolAccess } from "@/lib/auth/school-access";
import { z } from "zod";

const periodSchema = z.object({
  name: z.string().min(1, "Name is required"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:mm"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:mm"),
  sortOrder: z.number().int().default(0),
  // Supports creating one period for multiple departments at once
  // If empty / omitted → school-wide (departmentId = null)
  departmentIds: z.array(z.string()).optional().default([]),
  // Legacy single field still accepted for backwards compat
  departmentId: z.string().optional().nullable(),
});

async function getSchool(schoolSlug: string) {
  return prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true },
  });
}

/**
 * GET /api/schools/[schoolSlug]/timetable/periods
 * Query: ?departmentId=xxx&departmentId=yyy  — one or more department filters.
 * Omit entirely for school-wide only.
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
  if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const departmentIds = searchParams.getAll("departmentId");

  const where: any = { schoolId: school.id };

  if (departmentIds.length === 1) {
    // Single department: return dept-specific + school-wide
    where.OR = [{ departmentId: departmentIds[0] }, { departmentId: null }];
  } else if (departmentIds.length > 1) {
    // Multiple departments: return templates for any of the selected depts + school-wide
    where.OR = [
      { departmentId: { in: departmentIds } },
      { departmentId: null },
    ];
  }
  // else: no filter → return everything (all depts + school-wide)

  try {
    const periods = await prisma.periodTemplate.findMany({
      where,
      include: { department: { select: { id: true, name: true } } },
      orderBy: [{ sortOrder: "asc" }, { startTime: "asc" }],
    });
    return NextResponse.json(periods);
  } catch (e: any) {
    console.error("[PERIODS_GET]", e?.message ?? e);
    return NextResponse.json({ error: "Internal Server Error", detail: e?.message }, { status: 500 });
  }
}

/**
 * POST /api/schools/[schoolSlug]/timetable/periods — create a period template.
 *
 * When `departmentIds` contains multiple entries the API creates one
 * PeriodTemplate record per department in a transaction.
 * When `departmentIds` is empty / omitted it creates a single school-wide record.
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
  if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

  const body = await req.json();
  const parsed = periodSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, startTime, endTime, sortOrder, departmentIds, departmentId } = parsed.data;

  // Resolve the effective set of targets:
  //  1. If departmentIds array has entries use those.
  //  2. Else fall back to legacy single departmentId field.
  //  3. Otherwise create school-wide (departmentId = null).
  const effectiveDeptIds: (string | null)[] =
    departmentIds && departmentIds.length > 0
      ? departmentIds
      : departmentId
        ? [departmentId]
        : [null];

  try {
    const created = await prisma.$transaction(
      effectiveDeptIds.map((dId) =>
        prisma.periodTemplate.create({
          data: {
            schoolId: school.id,
            departmentId: dId ?? null,
            name,
            startTime,
            endTime,
            sortOrder,
          },
          include: { department: { select: { id: true, name: true } } },
        }),
      ),
    );

    return NextResponse.json(created.length === 1 ? created[0] : created, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json(
        { error: "A period with this start/end time already exists for one of the selected departments" },
        { status: 409 },
      );
    }
    console.error("[PERIODS_POST]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
