import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasSchoolAccess } from "@/lib/auth/school-access";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  sortOrder: z.number().int().optional(),
  departmentId: z.string().nullable().optional(),
});

/** PATCH /api/schools/[schoolSlug]/timetable/periods/[periodId] */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; periodId: string }> },
) {
  const { schoolSlug, periodId } = await params;
  const session = await getSession();
  if (!session || !hasSchoolAccess(session, schoolSlug)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const period = await prisma.periodTemplate.update({
      where: { id: periodId },
      data: parsed.data,
    });
    return NextResponse.json(period);
  } catch (e: any) {
    if (e.code === "P2025") return NextResponse.json({ error: "Not found" }, { status: 404 });
    console.error("[PERIODS_PATCH]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/** DELETE /api/schools/[schoolSlug]/timetable/periods/[periodId] */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; periodId: string }> },
) {
  const { schoolSlug, periodId } = await params;
  const session = await getSession();
  if (!session || !hasSchoolAccess(session, schoolSlug)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.periodTemplate.delete({ where: { id: periodId } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.code === "P2025") return NextResponse.json({ error: "Not found" }, { status: 404 });
    console.error("[PERIODS_DELETE]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
