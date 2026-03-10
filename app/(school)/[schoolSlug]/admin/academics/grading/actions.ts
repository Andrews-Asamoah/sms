"use server";

import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { revalidatePath } from "next/cache";

export async function adoptSystemDefaultGrading(
  schoolSlug: string,
  systemDefaultId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner" &&
      !session.isSuperAdmin
    ) {
      return { success: false, error: "Unauthorized" };
    }

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) return { success: false, error: "School not found" };

    const sourceSystem = await prisma.gradingSystem.findUnique({
      where: { id: systemDefaultId, isSystemDefault: true },
      include: { gradeScales: true },
    });

    if (!sourceSystem) return { success: false, error: "Default system not found" };

    // Check if the school already has this exact code
    const existing = await prisma.gradingSystem.findFirst({
      where: { schoolId: school.id, code: sourceSystem.code },
    });

    if (existing) {
      return { success: false, error: "Your school already has a grading system with this code." };
    }

    // Clone it!
    await prisma.gradingSystem.create({
      data: {
        schoolId: school.id,
        name: `${sourceSystem.name} (Adopted)`,
        code: sourceSystem.code,
        description: sourceSystem.description,
        isSystemDefault: false,
        isActive: true,
        createdById: session.user.id,
        gradeScales: {
          create: sourceSystem.gradeScales.map((scale) => ({
            grade: scale.grade,
            description: scale.description,
            minScore: scale.minScore,
            maxScore: scale.maxScore,
            gradePoint: scale.gradePoint,
            displayOrder: scale.displayOrder,
          })),
        },
      },
    });

    revalidatePath(`/${schoolSlug}/admin/academics/grading`);
    return { success: true };
  } catch (error) {
    console.error("[ADOPT_GRADING_SYSTEM]", error);
    return { success: false, error: "Failed to adopt grading system." };
  }
}
