// app/api/schools/[schoolSlug]/students/purge/route.ts
//
// DELETE — permanently delete ALL student records for a school.
// Only owners (effectiveRole === "owner") are allowed.
//
// What gets deleted (via Prisma cascade on the `user` row):
//   user → accounts, sessions, member (org membership), userProfile → student
//   (plus all child records: enrollments, bills, attendances, scores, etc.)
//
// The student.delete() cascade defined in schema.prisma handles the
// student-side relations. The user delete handles the auth-side relations.

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;

    // ── 1. Auth — owners only ─────────────────────────────────────────────────
    const session = await requireSchoolAccess(schoolSlug);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const schoolAccess = getSchoolRole(session, schoolSlug);
    if (schoolAccess?.effectiveRole !== "owner" && !session.isSuperAdmin) {
      return NextResponse.json(
        { error: "Only school owners can perform this action." },
        { status: 403 },
      );
    }

    // ── 2. Load school ───────────────────────────────────────────────────────
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true, organizationId: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // ── 3. Collect all students with their user IDs ──────────────────────────
    const students = await prisma.student.findMany({
      where: { schoolId: school.id },
      select: {
        id: true,
        profile: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (students.length === 0) {
      return NextResponse.json({ deleted: 0, message: "No students to delete." });
    }

    const userIds = students
      .map((s) => s.profile?.userId)
      .filter((id): id is string => !!id);

    // ── 4. Delete in a transaction ───────────────────────────────────────────
    //
    // Order matters to satisfy FK constraints:
    //  a) Delete all student records (cascades: enrollments, bills, scores,
    //     attendances, guardian links, etc.)
    //  b) Delete org member rows for these users (Better Auth org plugin).
    //  c) Delete the user rows — Prisma cascade handles accounts & sessions.
    //
    await prisma.$transaction([
      // (a) Students + all child data
      prisma.student.deleteMany({ where: { schoolId: school.id } }),

      // (b) Org members for these users
      ...(userIds.length > 0
        ? [
            prisma.member.deleteMany({
              where: {
                organizationId: school.organizationId,
                userId: { in: userIds },
              },
            }),
          ]
        : []),

      // (c) User rows — cascades to accounts, sessions, userProfile, etc.
      ...(userIds.length > 0
        ? [prisma.user.deleteMany({ where: { id: { in: userIds } } })]
        : []),
    ]);

    // ── 5. Audit log ─────────────────────────────────────────────────────────
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE",
        entityType: "STUDENT_PURGE",
        entityId: school.id,
        newValues: {
          deletedCount: students.length,
          deletedBy: session.user.email,
          schoolId: school.id,
        },
      },
    });

    return NextResponse.json({
      success: true,
      deleted: students.length,
      message: `Successfully deleted ${students.length} student(s) and their login accounts.`,
    });
  } catch (error) {
    console.error("[Students PURGE] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to purge students",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
