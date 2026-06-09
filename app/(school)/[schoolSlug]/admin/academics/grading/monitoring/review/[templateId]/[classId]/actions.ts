"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getActiveSchoolRole } from "@/lib/auth/school-access";

/**
 * Mark all submitted grades for a class as FINAL
 */
export async function finalizeGrades(
  schoolSlug: string,
  templateId: string,
  classId: string
) {
  try {
    const session = await requireSchoolAccess(schoolSlug);
    const activeRole = await getActiveSchoolRole(session, schoolSlug);

    if (activeRole?.effectiveRole !== "admin" && activeRole?.effectiveRole !== "owner" && activeRole?.effectiveRole !== "headteacher" && !session.isSuperAdmin) {
      return { success: false, error: "Unauthorized" };
    }

    // Get all scores for this class/template that are currently SUBMITTED or DRAFT
    await prisma.assessmentScore.updateMany({
      where: {
        templateId,
        student: { classId },
        status: { in: ["SUBMITTED", "DRAFT"] }
      },
      data: {
        status: "FINAL"
      }
    });

    revalidatePath(`/${schoolSlug}/admin/academics/grading/monitoring/review/${templateId}/${classId}`);
    return { success: true, message: "Grades finalized successfully" };
  } catch (error) {
    console.error("[FINALIZE_GRADES] Error:", error);
    return { success: false, error: "Failed to finalize grades" };
  }
}

/**
 * Revert grades back to DRAFT for correction
 */
export async function revertGradesToDraft(
  schoolSlug: string,
  templateId: string,
  classId: string
) {
  try {
    const session = await requireSchoolAccess(schoolSlug);
    const activeRole = await getActiveSchoolRole(session, schoolSlug);

    if (activeRole?.effectiveRole !== "admin" && activeRole?.effectiveRole !== "owner" && activeRole?.effectiveRole !== "headteacher" && !session.isSuperAdmin) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.assessmentScore.updateMany({
      where: {
        templateId,
        student: { classId },
        status: "SUBMITTED"
      },
      data: {
        status: "DRAFT"
      }
    });

    revalidatePath(`/${schoolSlug}/admin/academics/grading/monitoring/review/${templateId}/${classId}`);
    return { success: true, message: "Grades reverted to draft" };
  } catch (error) {
    console.error("[REVERT_GRADES] Error:", error);
    return { success: false, error: "Failed to revert grades" };
  }
}
