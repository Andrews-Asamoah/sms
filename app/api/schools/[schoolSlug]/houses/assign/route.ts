// app/api/schools/[schoolSlug]/houses/assign/route.ts
//
// POST — bulk auto-assign all students with no house (balanced, school-level)
// PATCH — manually assign a specific student to a specific house

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";

// ─── helpers ────────────────────────────────────────────────────────────────

// ─── authorization guard ─────────────────────────────────────────────────────

async function authorize(schoolSlug: string) {
  const session = await requireSchoolAccess(schoolSlug);
  const role = getSchoolRole(session, schoolSlug);

  if (
    role?.effectiveRole !== "admin" &&
    role?.effectiveRole !== "owner" &&
    !session.isSuperAdmin
  ) {
    return { session: null, school: null, error: "Unauthorized" };
  }

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true, subdomain: true },
  });

  if (!school) return { session: null, school: null, error: "School not found" };

  return { session, school, error: null };
}

// ─── POST — bulk auto-assign unassigned students ─────────────────────────────

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;
    const { session, school, error } = await authorize(schoolSlug);

    if (error || !session || !school) {
      return NextResponse.json(
        { error: error ?? "Unauthorized" },
        { status: error === "School not found" ? 404 : 403 },
      );
    }

    // Fetch all active houses
    const houses = await prisma.house.findMany({
      where: { schoolId: school.id, isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    if (houses.length === 0) {
      return NextResponse.json(
        { assigned: 0, message: "No active houses found." },
        { status: 200 },
      );
    }

    // Fetch all active students without a house AND with a class (industry rule)
    const unassigned = await prisma.student.findMany({
      where: {
        schoolId: school.id,
        houseId: null,
        classId: { not: null }, // must have a class
        status: "ACTIVE",
      },
      select: { id: true },
    });

    if (unassigned.length === 0) {
      return NextResponse.json(
        { assigned: 0, message: "All eligible students are already assigned." },
        { status: 200 },
      );
    }

    // Fetch current student counts per active house
    const counts = await prisma.student.groupBy({
      by: ["houseId"],
      where: {
        schoolId: school.id,
        houseId: { in: houses.map((h) => h.id) },
        status: "ACTIVE",
      },
      _count: { houseId: true },
    });

    const houseCounts = houses.map((h) => {
      const group = counts.find((c) => c.houseId === h.id);
      return {
        id: h.id,
        count: group?._count?.houseId ?? 0,
      };
    });

    // Balanced in-memory distribution of students to houses
    const studentAssignments: { studentId: string; houseId: string }[] = [];
    for (const student of unassigned) {
      // Sort houses by number of students in memory (ascending)
      houseCounts.sort((a, b) => a.count - b.count);
      const targetHouse = houseCounts[0];

      studentAssignments.push({
        studentId: student.id,
        houseId: targetHouse.id,
      });

      // Increment in-memory counter to keep balance accurate for the next iteration
      targetHouse.count++;
    }

    // Group student IDs by house to minimize database updates
    const assignmentsByHouse: Record<string, string[]> = {};
    for (const { studentId, houseId } of studentAssignments) {
      if (!assignmentsByHouse[houseId]) {
        assignmentsByHouse[houseId] = [];
      }
      assignmentsByHouse[houseId].push(studentId);
    }

    // Create bulk update tasks
    const updatePromises = Object.entries(assignmentsByHouse).map(([houseId, studentIds]) =>
      prisma.student.updateMany({
        where: { id: { in: studentIds } },
        data: { houseId },
      })
    );

    // Execute bulk updates in a single transaction
    await prisma.$transaction(updatePromises);
    const assigned = unassigned.length;

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        schoolId: school.id,
        action: "UPDATE",
        entityType: "House",
        entityId: school.id,
        newValues: { action: "bulk_auto_assign", assignedCount: assigned },
      },
    });

    return NextResponse.json({
      assigned,
      message: `${assigned} student${assigned !== 1 ? "s" : ""} assigned to houses.`,
    });
  } catch (error) {
    console.error("[HOUSES_ASSIGN_POST] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── PATCH — manually assign a student to a specific house ──────────────────

const manualAssignSchema = z.object({
  studentId: z.string().min(1),
  houseId: z.string().min(1),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;
    const { session, school, error } = await authorize(schoolSlug);

    if (error || !session || !school) {
      return NextResponse.json(
        { error: error ?? "Unauthorized" },
        { status: error === "School not found" ? 404 : 403 },
      );
    }

    const body = await request.json();
    const { studentId, houseId } = manualAssignSchema.parse(body);

    // Verify the student belongs to this school
    const student = await prisma.student.findUnique({
      where: { id: studentId, schoolId: school.id },
      select: { id: true, houseId: true, profile: { select: { firstName: true, lastName: true } } },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Verify the house belongs to this school
    const house = await prisma.house.findUnique({
      where: { id: houseId, schoolId: school.id },
      select: { id: true, name: true },
    });

    if (!house) {
      return NextResponse.json({ error: "House not found" }, { status: 404 });
    }

    const updated = await prisma.student.update({
      where: { id: studentId },
      data: { houseId },
      select: { id: true, houseId: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        schoolId: school.id,
        action: "UPDATE",
        entityType: "Student",
        entityId: studentId,
        newValues: {
          action: "manual_house_assign",
          previousHouseId: student.houseId,
          newHouseId: houseId,
          houseName: house.name,
        },
      },
    });

    return NextResponse.json({ success: true, student: updated });
  } catch (error) {
    console.error("[HOUSES_ASSIGN_PATCH] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
