"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getActiveSchoolRole } from "@/lib/auth/school-access";

/**
 * Toggle the global lock status of an assessment template
 */
export async function toggleTemplateLock(
  schoolSlug: string,
  templateId: string,
  isLocked: boolean
) {
  try {
    const session = await requireSchoolAccess(schoolSlug);
    const activeRole = await getActiveSchoolRole(session, schoolSlug);
    
    if (activeRole?.effectiveRole !== "admin" && activeRole?.effectiveRole !== "owner" && !session.isSuperAdmin) {
       return { success: false, error: "Unauthorized" };
    }

    await prisma.assessmentTemplate.update({
      where: { id: templateId },
      data: { isLocked },
    });

    revalidatePath(`/${schoolSlug}/admin/academics/grading/monitoring`);
    return { success: true, message: `Assessment ${isLocked ? "locked" : "unlocked"} successfully` };
  } catch (error) {
    console.error("[TOGGLE_LOCK] Error:", error);
    return { success: false, error: "Failed to update lock status" };
  }
}

/**
 * Extend the deadline for an assessment template, either globally or for a specific class
 */
export async function extendDeadline(
  schoolSlug: string,
  templateId: string,
  deadline: Date,
  classId?: string
) {
  try {
    const session = await requireSchoolAccess(schoolSlug);
    const activeRole = await getActiveSchoolRole(session, schoolSlug);
    
    if (activeRole?.effectiveRole !== "admin" && activeRole?.effectiveRole !== "owner" && !session.isSuperAdmin) {
       return { success: false, error: "Unauthorized" };
    }

    if (classId) {
      // Create or update a class-specific extension
      await prisma.assessmentExtension.upsert({
        where: {
          templateId_classId_teacherId: {
            templateId,
            classId,
            teacherId: null as any, // Null for class-wide extension
          },
        },
        update: {
          deadline,
        },
        create: {
          templateId,
          classId,
          teacherId: null,
          deadline,
        },
      });
    } else {
      // Update global deadline on the template
      await prisma.assessmentTemplate.update({
        where: { id: templateId },
        data: { deadline },
      });
    }

    revalidatePath(`/${schoolSlug}/admin/academics/grading/monitoring`);
    return { success: true, message: "Deadline updated successfully" };
  } catch (error) {
    console.error("[EXTEND_DEADLINE] Error:", error);
    return { success: false, error: "Failed to update deadline" };
  }
}
