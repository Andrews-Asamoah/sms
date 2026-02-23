// app/(school)/[schoolSlug]/teacher/classes/[classId]/gradebook/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";

interface SaveMarksData {
  studentId: string;
  componentScores: {
    componentId: string;
    marks: number;
  }[];
}

interface SaveMarksRequest {
  schoolSlug: string;
  classId: string;
  subjectId: string;
  termId: string;
  templateId: string;
  marks: SaveMarksData[];
}

interface MarksDataResult {
  students: {
    id: string;
    admissionNumber: string | null;
    profile: {
      firstName: string;
      lastName: string;
      otherNames: string | null;
      user: {
        email: string | null;
        image: string | null;
      };
    };
  }[];
  template: {
    id: string;
    name: string;
    components: {
      id: string;
      name: string;
      maxMarks: number | { toNumber(): number };
      weight: number | { toNumber(): number };
      displayOrder: number;
    }[];
    gradingSystem: {
      gradeScales: {
        id: string;
        grade: string;
        minScore: number | { toNumber(): number };
        maxScore: number | { toNumber(): number };
        gradePoint: number | { toNumber(): number };
        description: string | null;
      }[];
    };
  };
  existingScores: {
    studentId: string;
    componentScores: {
      componentId: string;
      marksObtained: number | { toNumber(): number };
    }[];
  }[];
  className: string;
  subjectName: string;
}

// ============================================================================
// GET MARKS DATA
// ============================================================================

export async function getMarksData(
  schoolSlug: string,
  classId: string,
  subjectId: string,
  termId: string,
): Promise<
  { success: true; data: MarksDataResult } | { success: false; error: string }
> {
  try {
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      !["teacher", "admin", "owner"].includes(role?.effectiveRole || "") &&
      !session.isSuperAdmin
    ) {
      return { success: false, error: "Unauthorized" };
    }

    // 1. Get Class & Subject details to find appropriate template
    const [classData, subjectData] = await Promise.all([
      prisma.class.findUnique({
        where: { id: classId },
        select: { level: true, name: true },
      }),
      prisma.subject.findUnique({
        where: { id: subjectId },
        select: { code: true, name: true },
      }),
    ]);

    if (!classData || !subjectData) {
      return { success: false, error: "Class or Subject not found" };
    }

    // 2. Find Active Assessment Template
    // Logic: Try to find specific template for (ClassLevel + Subject),
    // fallback to (ClassLevel only), fallback to (Subject only), fallback to Default

    // For simplicity in this MVP, we'll fetch all active templates for the school and filter in code logic
    // or just find the best match. Let's try precise matching first.

    let template = await prisma.assessmentTemplate.findFirst({
      where: {
        school: { subdomain: schoolSlug },
        isActive: true,
        classLevel: classData.level,
        subjectCode: subjectData.code,
      },
      include: {
        components: { orderBy: { displayOrder: "asc" } },
        gradingSystem: {
          include: {
            gradeScales: { orderBy: { minScore: "desc" } },
          },
        },
      },
    });

    // Fallback 1: Match Class Level only (generic template for all subjects in that class)
    if (!template) {
      template = await prisma.assessmentTemplate.findFirst({
        where: {
          school: { subdomain: schoolSlug },
          isActive: true,
          classLevel: classData.level,
          subjectCode: null,
        },
        include: {
          components: { orderBy: { displayOrder: "asc" } },
          gradingSystem: {
            include: {
              gradeScales: { orderBy: { minScore: "desc" } },
            },
          },
        },
      });
    }

    // Fallback 2: Match Subject only (generic template for that subject across classes)
    if (!template) {
      template = await prisma.assessmentTemplate.findFirst({
        where: {
          school: { subdomain: schoolSlug },
          isActive: true,
          classLevel: null,
          subjectCode: subjectData.code,
        },
        include: {
          components: { orderBy: { displayOrder: "asc" } },
          gradingSystem: {
            include: {
              gradeScales: { orderBy: { minScore: "desc" } },
            },
          },
        },
      });
    }

    if (!template) {
      return {
        success: false,
        error: "No active assessment template found for this class/subject.",
      };
    }

    // 3. Get Students enrolled in this class
    // TODO: Filter by academic year? Assuming classId implies specific academic year instance
    const students = await prisma.student.findMany({
      where: {
        enrollments: {
          some: {
            classId: classId,
            status: "ACTIVE",
          },
        },
      },
      include: {
        profile: {
          select: {
            firstName: true,
            lastName: true,
            otherNames: true,
            user: {
              select: {
                email: true,
                image: true,
              },
            },
          },
        },
      },
      orderBy: {
        profile: {
          lastName: "asc",
        },
      },
    });

    // 4. Get Existing Scores
    const existingScores = await prisma.assessmentScore.findMany({
      where: {
        subjectId,
        termId,
        studentId: { in: students.map((s) => s.id) },
        templateId: template.id,
      },
      include: {
        componentScores: true,
      },
    });

    return {
      success: true,
      data: {
        students,
        template,
        existingScores,
        className: classData.name,
        subjectName: subjectData.name,
      },
    };
  } catch (error) {
    console.error("[GET_MARKS_DATA] Error:", error);
    return { success: false, error: "Failed to fetch marks data" };
  }
}

// ============================================================================
// SAVE MARKS ENTRY
// ============================================================================

export async function saveMarksEntry(req: SaveMarksRequest) {
  try {
    const { schoolSlug, classId, subjectId, termId, templateId, marks } = req;

    // Auth check
    const session = await requireSchoolAccess(schoolSlug);
    // (Assuming role check done in UI/middleware, but good to have here too)

    // Get template for validation and grading
    const template = await prisma.assessmentTemplate.findUnique({
      where: { id: templateId },
      include: {
        components: true,
        gradingSystem: {
          include: { gradeScales: true },
        },
      },
    });

    if (!template) return { success: false, error: "Template not found" };

    // Process each student's marks
    // We use a transaction to ensure integrity
    await prisma.$transaction(async (tx) => {
      for (const studentEntry of marks) {
        let totalWeightedScore = 0;
        let totalMaxWeight = 0; // To normalize if needed, but assuming 100%

        // Calculate totals
        for (const compScore of studentEntry.componentScores) {
          const component = template.components.find(
            (c) => c.id === compScore.componentId,
          );
          if (component) {
            const marks = Number(compScore.marks);
            const weight = Number(component.weight);
            const maxMarks = Number(component.maxMarks);

            // Validation: Marks cannot exceed maxMarks
            if (marks > maxMarks) {
              throw new Error(
                `Marks entered for student ${studentEntry.studentId} exceed max marks for ${component.name}`,
              );
            }

            const weighted = (marks / maxMarks) * weight;
            totalWeightedScore += weighted;
            totalMaxWeight += weight;
          }
        }

        // Determine Grade
        // totalWeightedScore is effectively the percentage if totalMaxWeight is 100
        const percentage = totalWeightedScore; // Assuming sum of weights is 100

        let grade = "F";
        let gradePoint = 0;
        let remarks = "";

        // Find matching grade scale
        const scale = template.gradingSystem.gradeScales.find(
          (s) =>
            percentage >= Number(s.minScore) &&
            percentage <= Number(s.maxScore),
        );

        if (scale) {
          grade = scale.grade;
          gradePoint = Number(scale.gradePoint);
          // remarks = scale.description; // Optional
        }

        // Upsert AssessmentScore
        const assessmentScore = await tx.assessmentScore.upsert({
          where: {
            studentId_subjectId_termId: {
              studentId: studentEntry.studentId,
              subjectId,
              termId,
            },
          },
          create: {
            studentId: studentEntry.studentId,
            subjectId,
            termId,
            templateId,
            totalScore: percentage, // In this system, totalScore seems to be percentage? Or absolute sum?
            // The schema has totalScore and percentage. width weighted system, percentage IS the total score out of 100.
            percentage: percentage,
            grade,
            gradePoint,
          },
          update: {
            templateId, // Update template ID if changed (rare)
            totalScore: percentage,
            percentage: percentage,
            grade,
            gradePoint,
            updatedAt: new Date(),
          },
        });

        // Upsert ComponentScores
        for (const compScore of studentEntry.componentScores) {
          const component = template.components.find(
            (c) => c.id === compScore.componentId,
          );
          if (!component) continue;

          const marks = Number(compScore.marks);
          const weight = Number(component.weight);
          const maxMarks = Number(component.maxMarks);
          const weighted = (marks / maxMarks) * weight;
          const percentageComp = (marks / maxMarks) * 100;

          await tx.componentScore.upsert({
            where: {
              assessmentScoreId_componentId: {
                assessmentScoreId: assessmentScore.id,
                componentId: compScore.componentId,
              },
            },
            create: {
              assessmentScoreId: assessmentScore.id,
              componentId: compScore.componentId,
              marksObtained: marks,
              maxMarks: maxMarks,
              percentage: percentageComp,
              weightedScore: weighted,
              recordedById: session.user.id,
            },
            update: {
              marksObtained: marks,
              maxMarks: maxMarks,
              percentage: percentageComp,
              weightedScore: weighted,
              recordedById: session.user.id,
              updatedAt: new Date(),
            },
          });
        }
      }
    });

    revalidatePath(`/${schoolSlug}/teacher/classes/${classId}/gradebook`);

    return { success: true, message: "Marks saved successfully" };
  } catch (error) {
    console.error("[SAVE_MARKS] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save marks",
    };
  }
}
