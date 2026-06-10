import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { Prisma, AttendanceStatus } from "@prisma/client";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ schoolSlug: string }> }
) {
  const { schoolSlug } = await props.params;

  // ── Auth ────────────────────────────────────────────────────────────────
  const session = await requireSchoolAccess(schoolSlug);
  const role = getSchoolRole(session, schoolSlug);

  if (
    role?.effectiveRole !== "admin" &&
    role?.effectiveRole !== "owner" &&
    role?.effectiveRole !== "headteacher" &&
    !session.isSuperAdmin
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true },
  });
  if (!school)
    return NextResponse.json({ error: "School not found" }, { status: 404 });

  // ── Query params ─────────────────────────────────────────────────────────
  const { searchParams } = req.nextUrl;
  const classId      = searchParams.get("classId")  || null;
  const dateFrom     = searchParams.get("dateFrom") || null;
  const dateTo       = searchParams.get("dateTo")   || null;
  const statusParam  = searchParams.get("status")   || null;

  // Build typed where input — no dynamic spreading
  const studentFilter: Prisma.StudentWhereInput = {
    schoolId: school.id,
    status: "ACTIVE",
    ...(classId ? { classId } : {}),
  };

  const dateFilter: Prisma.DateTimeFilter<"Attendance"> | undefined =
    dateFrom || dateTo
      ? {
          ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
          ...(dateTo   ? { lte: new Date(dateTo + "T23:59:59Z") } : {}),
        }
      : undefined;

  const baseWhere: Prisma.AttendanceWhereInput = {
    student: studentFilter,
    ...(dateFilter ? { date: dateFilter } : {}),
  };

  // ── Summary counts ────────────────────────────────────────────────────────
  const statuses: AttendanceStatus[] = [
    "PRESENT",
    "ABSENT",
    "LATE",
    "EXCUSED",
    "SICK",
    "PERMISSION",
  ];

  const [totalRecords, ...statusCounts] = await Promise.all([
    prisma.attendance.count({ where: baseWhere }),
    ...statuses.map((s) =>
      prisma.attendance.count({
        where: { ...baseWhere, status: s } satisfies Prisma.AttendanceWhereInput,
      })
    ),
  ]);

  const [presentCount, absentCount, lateCount, excusedCount, sickCount, permissionCount] =
    statusCounts;

  // ── Per-student aggregates via groupBy ────────────────────────────────────
  const groupedWhere: Prisma.AttendanceWhereInput = {
    ...baseWhere,
    ...(statusParam ? { status: statusParam as AttendanceStatus } : {}),
  };

  const rawGrouped = await prisma.attendance.groupBy({
    by: ["studentId", "status"],
    where: groupedWhere,
    _count: { id: true },
  });

  // Collect distinct studentIds
  const studentIds = [...new Set(rawGrouped.map((r) => r.studentId))];

  const students =
    studentIds.length > 0
      ? await prisma.student.findMany({
          where: { id: { in: studentIds }, schoolId: school.id },
          select: {
            id: true,
            profile: { select: { firstName: true, lastName: true } },
            class: { select: { id: true, name: true } },
          },
        })
      : [];

  const studentMap = new Map(students.map((s) => [s.id, s]));

  // Aggregate counts per student
  type StudentRow = {
    studentId: string;
    name: string;
    className: string;
    present: number;
    absent: number;
    late: number;
    excused: number;
    sick: number;
    permission: number;
    total: number;
    attendanceRate: number;
  };

  const studentAggMap = new Map<string, StudentRow>();

  for (const row of rawGrouped) {
    if (!studentAggMap.has(row.studentId)) {
      const info = studentMap.get(row.studentId);
      studentAggMap.set(row.studentId, {
        studentId: row.studentId,
        name: info?.profile
          ? `${info.profile.firstName} ${info.profile.lastName}`
          : "Unknown",
        className: info?.class?.name ?? "—",
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        sick: 0,
        permission: 0,
        total: 0,
        attendanceRate: 0,
      });
    }

    const entry = studentAggMap.get(row.studentId)!;
    const count = row._count.id;
    entry.total += count;

    switch (row.status) {
      case "PRESENT":    entry.present    += count; break;
      case "ABSENT":     entry.absent     += count; break;
      case "LATE":       entry.late       += count; break;
      case "EXCUSED":    entry.excused    += count; break;
      case "SICK":       entry.sick       += count; break;
      case "PERMISSION": entry.permission += count; break;
    }
  }

  // Compute attendance rate: present + any excused/late/sick/permission counts as attended
  for (const entry of studentAggMap.values()) {
    const attended =
      entry.present + entry.late + entry.excused + entry.sick + entry.permission;
    entry.attendanceRate =
      entry.total > 0 ? Math.round((attended / entry.total) * 1000) / 10 : 0;
  }

  // Sort by attendance rate ascending — at-risk students first
  const rows = [...studentAggMap.values()].sort(
    (a, b) => a.attendanceRate - b.attendanceRate
  );

  return NextResponse.json({
    summary: {
      total:      totalRecords,
      present:    presentCount,
      absent:     absentCount,
      late:       lateCount,
      excused:    excusedCount,
      sick:       sickCount,
      permission: permissionCount,
    },
    rows,
  });
}
