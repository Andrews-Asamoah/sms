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

export async function ensureSystemDefaultGradingSystems() {
  try {
    const count = await prisma.gradingSystem.count({
      where: { isSystemDefault: true }
    });
    if (count > 0) return;

    const defaultSystems = [
      {
        name: "WAEC BECE Standard System",
        code: "BECE",
        description: "Ghana WAEC Basic Education Certificate Examination 9-grade stanine scale (Grades 1-9, where 1 is the highest).",
        isSystemDefault: true,
        gradeScales: [
          { grade: "1", description: "Highest / Excellent", minScore: 90, maxScore: 100, gradePoint: 1.0, displayOrder: 1 },
          { grade: "2", description: "Very Good", minScore: 80, maxScore: 89.99, gradePoint: 2.0, displayOrder: 2 },
          { grade: "3", description: "Good", minScore: 70, maxScore: 79.99, gradePoint: 3.0, displayOrder: 3 },
          { grade: "4", description: "High Pass", minScore: 60, maxScore: 69.99, gradePoint: 4.0, displayOrder: 4 },
          { grade: "5", description: "Pass", minScore: 55, maxScore: 59.99, gradePoint: 5.0, displayOrder: 5 },
          { grade: "6", description: "Average Pass", minScore: 50, maxScore: 54.99, gradePoint: 6.0, displayOrder: 6 },
          { grade: "7", description: "Low Pass", minScore: 45, maxScore: 49.99, gradePoint: 7.0, displayOrder: 7 },
          { grade: "8", description: "Weak Pass", minScore: 40, maxScore: 44.99, gradePoint: 8.0, displayOrder: 8 },
          { grade: "9", description: "Lowest / Fail", minScore: 0, maxScore: 39.99, gradePoint: 9.0, displayOrder: 9 },
        ]
      },
      {
        name: "WAEC WASSCE Standard System",
        code: "WASSCE",
        description: "West African Senior School Certificate Examination grading scale (A1 to F9).",
        isSystemDefault: true,
        gradeScales: [
          { grade: "A1", description: "Excellent", minScore: 75, maxScore: 100, gradePoint: 4.0, displayOrder: 1 },
          { grade: "B2", description: "Very Good", minScore: 70, maxScore: 74.99, gradePoint: 3.5, displayOrder: 2 },
          { grade: "B3", description: "Good", minScore: 65, maxScore: 69.99, gradePoint: 3.0, displayOrder: 3 },
          { grade: "C4", description: "Credit", minScore: 60, maxScore: 64.99, gradePoint: 2.5, displayOrder: 4 },
          { grade: "C5", description: "Credit", minScore: 55, maxScore: 59.99, gradePoint: 2.0, displayOrder: 5 },
          { grade: "C6", description: "Credit", minScore: 50, maxScore: 54.99, gradePoint: 1.5, displayOrder: 6 },
          { grade: "D7", description: "Pass", minScore: 45, maxScore: 49.99, gradePoint: 1.0, displayOrder: 7 },
          { grade: "E8", description: "Pass", minScore: 40, maxScore: 44.99, gradePoint: 0.5, displayOrder: 8 },
          { grade: "F9", description: "Fail", minScore: 0, maxScore: 39.99, gradePoint: 0.0, displayOrder: 9 },
        ]
      },
      {
        name: "US GPA Letter Grade System",
        code: "US_GPA",
        description: "Standard United States Letter Grading System with corresponding 4.0 scale GPA values.",
        isSystemDefault: true,
        gradeScales: [
          { grade: "A+", description: "Outstanding", minScore: 97, maxScore: 100, gradePoint: 4.0, displayOrder: 1 },
          { grade: "A", description: "Excellent", minScore: 93, maxScore: 96.99, gradePoint: 4.0, displayOrder: 2 },
          { grade: "A-", description: "Very Good", minScore: 90, maxScore: 92.99, gradePoint: 3.7, displayOrder: 3 },
          { grade: "B+", description: "Good", minScore: 87, maxScore: 89.99, gradePoint: 3.3, displayOrder: 4 },
          { grade: "B", description: "Above Average", minScore: 83, maxScore: 86.99, gradePoint: 3.0, displayOrder: 5 },
          { grade: "B-", description: "Average", minScore: 80, maxScore: 82.99, gradePoint: 2.7, displayOrder: 6 },
          { grade: "C+", description: "Fair", minScore: 77, maxScore: 79.99, gradePoint: 2.3, displayOrder: 7 },
          { grade: "C", description: "Satisfactory", minScore: 73, maxScore: 76.99, gradePoint: 2.0, displayOrder: 8 },
          { grade: "C-", description: "Passing", minScore: 70, maxScore: 72.99, gradePoint: 1.7, displayOrder: 9 },
          { grade: "D+", description: "Poor Pass", minScore: 67, maxScore: 69.99, gradePoint: 1.3, displayOrder: 10 },
          { grade: "D", description: "Minimal Pass", minScore: 65, maxScore: 66.99, gradePoint: 1.0, displayOrder: 11 },
          { grade: "F", description: "Fail", minScore: 0, maxScore: 64.99, gradePoint: 0.0, displayOrder: 12 },
        ]
      },
      {
        name: "IB (International Baccalaureate)",
        code: "IB",
        description: "International Baccalaureate 1 to 7 point grading scale used worldwide.",
        isSystemDefault: true,
        gradeScales: [
          { grade: "7", description: "Excellent", minScore: 90, maxScore: 100, gradePoint: 7.0, displayOrder: 1 },
          { grade: "6", description: "Very Good", minScore: 80, maxScore: 89.99, gradePoint: 6.0, displayOrder: 2 },
          { grade: "5", description: "Good", minScore: 70, maxScore: 79.99, gradePoint: 5.0, displayOrder: 3 },
          { grade: "4", description: "Satisfactory", minScore: 60, maxScore: 69.99, gradePoint: 4.0, displayOrder: 4 },
          { grade: "3", description: "Mediocre", minScore: 50, maxScore: 59.99, gradePoint: 3.0, displayOrder: 5 },
          { grade: "2", description: "Poor", minScore: 40, maxScore: 49.99, gradePoint: 2.0, displayOrder: 6 },
          { grade: "1", description: "Very Poor", minScore: 0, maxScore: 39.99, gradePoint: 1.0, displayOrder: 7 },
        ]
      },
      {
        name: "UK GCSE Standard System",
        code: "UK_GCSE",
        description: "United Kingdom General Certificate of Secondary Education modern 9-1 grading scheme.",
        isSystemDefault: true,
        gradeScales: [
          { grade: "9", description: "Highest", minScore: 90, maxScore: 100, gradePoint: 9.0, displayOrder: 1 },
          { grade: "8", description: "Excellent", minScore: 80, maxScore: 89.99, gradePoint: 8.0, displayOrder: 2 },
          { grade: "7", description: "Very Good", minScore: 75, maxScore: 79.99, gradePoint: 7.0, displayOrder: 3 },
          { grade: "6", description: "Good", minScore: 65, maxScore: 74.99, gradePoint: 6.0, displayOrder: 4 },
          { grade: "5", description: "Strong Pass", minScore: 55, maxScore: 64.99, gradePoint: 5.0, displayOrder: 5 },
          { grade: "4", description: "Standard Pass", minScore: 50, maxScore: 54.99, gradePoint: 4.0, displayOrder: 6 },
          { grade: "3", description: "Refining", minScore: 40, maxScore: 49.99, gradePoint: 3.0, displayOrder: 7 },
          { grade: "2", description: "Basic", minScore: 30, maxScore: 39.99, gradePoint: 2.0, displayOrder: 8 },
          { grade: "1", description: "Lowest", minScore: 0, maxScore: 29.99, gradePoint: 1.0, displayOrder: 9 },
        ]
      }
    ];

    for (const sys of defaultSystems) {
      await prisma.gradingSystem.create({
        data: {
          name: sys.name,
          code: sys.code,
          description: sys.description,
          isSystemDefault: sys.isSystemDefault,
          gradeScales: {
            create: sys.gradeScales
          }
        }
      });
    }
  } catch (error) {
    console.error("[ENSURE_SYSTEM_DEFAULTS]", error);
  }
}
