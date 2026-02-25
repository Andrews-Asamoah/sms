"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";

export async function assignSubjectsToClass(
  schoolSlug: string,
  classId: string,
  subjectIds: string[],
) {
  try {
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      !session.isSuperAdmin &&
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner"
    ) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Get current assignments to avoid deleting teacher links for subjects that stay
      const existingAssignments = await tx.classSubject.findMany({
        where: { classId },
      });

      const existingSubjectIds = existingAssignments.map((a) => a.subjectId);

      // 2. Remove subjects that are no longer selected
      await tx.classSubject.deleteMany({
        where: {
          classId,
          subjectId: { notIn: subjectIds },
        },
      });

      // 3. Add new subjects
      const newSubjectIds = subjectIds.filter(
        (id) => !existingSubjectIds.includes(id),
      );

      if (newSubjectIds.length > 0) {
        await tx.classSubject.createMany({
          data: newSubjectIds.map((subjectId) => ({
            classId,
            subjectId,
            isCompulsory: true,
          })),
        });
      }
    });

    revalidatePath(`/${schoolSlug}/admin/classes`);
    return { success: true, message: "Subjects updated successfully" };
  } catch (error) {
    console.error("[ASSIGN_SUBJECTS] Error:", error);
    return { success: false, error: "Failed to assign subjects" };
  }
}

export async function updateClassSubjectTeacher(
  schoolSlug: string,
  classId: string,
  subjectId: string,
  teacherId: string | null,
) {
  try {
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      !session.isSuperAdmin &&
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner"
    ) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.classSubject.update({
      where: {
        classId_subjectId: {
          classId,
          subjectId,
        },
      },
      data: {
        teacherId: teacherId || null,
      },
    });

    revalidatePath(`/${schoolSlug}/admin/classes`);
    return { success: true, message: "Teacher assigned successfully" };
  } catch (error) {
    console.error("[UPDATE_SUBJECT_TEACHER] Error:", error);
    return { success: false, error: "Failed to assign teacher" };
  }
}

export async function bulkAssignSubjectsToLevel(
  schoolSlug: string,
  level: string,
  academicYearId: string,
  subjectIds: string[],
) {
  try {
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      !session.isSuperAdmin &&
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner"
    ) {
      return { success: false, error: "Unauthorized" };
    }

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) return { success: false, error: "School not found" };

    // Get all classes for this level and academic year
    const classes = await prisma.class.findMany({
      where: {
        schoolId: school.id,
        level,
        academicYearId,
      },
      select: { id: true },
    });

    if (classes.length === 0) {
      return { success: false, error: "No classes found for this level" };
    }

    // Apply to each class
    for (const cls of classes) {
      await assignSubjectsToClass(schoolSlug, cls.id, subjectIds);
    }

    revalidatePath(`/${schoolSlug}/admin/classes`);
    return {
      success: true,
      message: `Subjects applied to all ${level} sections`,
    };
  } catch (error) {
    console.error("[BULK_ASSIGN_LEVEL] Error:", error);
    return { success: false, error: "Failed to apply subjects to level" };
  }
}

export async function syncSubjectTeacherAcrossSections(
  schoolSlug: string,
  level: string,
  academicYearId: string,
  subjectId: string,
  teacherId: string | null,
) {
  try {
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      !session.isSuperAdmin &&
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner"
    ) {
      return { success: false, error: "Unauthorized" };
    }

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) return { success: false, error: "School not found" };

    // Update ClassSubject in all classes of this level
    await prisma.classSubject.updateMany({
      where: {
        subjectId,
        class: {
          schoolId: school.id,
          level,
          academicYearId,
        },
      },
      data: {
        teacherId: teacherId || null,
      },
    });

    revalidatePath(`/${schoolSlug}/admin/classes`);
    return {
      success: true,
      message: "Teacher assignment synced across sections",
    };
  } catch (error) {
    console.error("[SYNC_TEACHER_SECTIONS] Error:", error);
    return { success: false, error: "Failed to sync teacher across sections" };
  }
}
