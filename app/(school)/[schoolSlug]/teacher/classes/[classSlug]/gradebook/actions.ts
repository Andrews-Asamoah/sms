// app/(school)/[schoolSlug]/teacher/classes/[classId]/gradebook/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole, getActiveSchoolRole } from "@/lib/auth/school-access";

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
  status: "DRAFT" | "SUBMITTED" | "REVIEWED" | "FINAL";
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
    deadline: string | null;
    isLocked: boolean;
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
    status: "DRAFT" | "SUBMITTED" | "REVIEWED" | "FINAL";
    isLocked: boolean;
    componentScores: {
      componentId: string;
      marksObtained: number | { toNumber(): number };
    }[];
  }[];
  extension: {
    deadline: string;
  } | null;
  isPublished: boolean;
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
    const activeRole = await getActiveSchoolRole(session, schoolSlug);
    const effectiveRole = activeRole?.effectiveRole || "teacher";

    if (
      !["teacher", "admin", "owner", "headteacher"].includes(effectiveRole) &&
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
        classId: classId,
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

    // Fallback: Global School-wide template (neither class nor subject restricted)
    if (!template) {
      template = await prisma.assessmentTemplate.findFirst({
        where: {
          school: { subdomain: schoolSlug },
          isActive: true,
          classId: null,
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
        schoolId: (
          await prisma.school.findUnique({
            where: { subdomain: schoolSlug },
            select: { id: true },
          })
        )?.id,
        status: "ACTIVE",
        OR: [
          {
            enrollments: {
              some: {
                classId: classId,
                status: "ACTIVE",
              },
            },
          },
          {
            classId: classId,
          },
        ],
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
    const [existingScores, extension, school, publishedSet] = await Promise.all([
      prisma.assessmentScore.findMany({
        where: { subjectId, termId, templateId: template.id },
        include: { componentScores: true },
      }),
      prisma.assessmentExtension.findFirst({
        where: { templateId: template.id, classId },
        select: { deadline: true },
      }),
      prisma.school.findUnique({
        where: { subdomain: schoolSlug },
        select: { id: true },
      }),
      prisma.reportCardSet.findFirst({
        where: {
          termId,
          status: "PUBLISHED",
          OR: [
            { classId },
            { targetClasses: { some: { classId } } },
          ],
        },
        select: { id: true },
      }),
    ]);

    if (!school) return { success: false, error: "School not found" };

    return {
      success: true,
      data: {
        students: students.map((s) => ({
          id: s.id,
          admissionNumber: s.admissionNumber,
          profile: {
            firstName: s.profile.firstName,
            lastName: s.profile.lastName,
            otherNames: s.profile.otherNames,
            user: {
              email: s.profile.user.email,
              image: s.profile.user.image,
            },
          },
        })),
        template: {
          id: template.id,
          name: template.name,
          components: template.components.map((c) => ({
            id: c.id,
            name: c.name,
            maxMarks: Number(c.maxMarks),
            weight: Number(c.weight),
            displayOrder: c.displayOrder,
          })),
          deadline: template.deadline?.toISOString() || null,
          isLocked: template.isLocked,
          gradingSystem: {
            gradeScales: template.gradingSystem.gradeScales.map((gs) => ({
              id: gs.id,
              grade: gs.grade,
              minScore: Number(gs.minScore),
              maxScore: Number(gs.maxScore),
              gradePoint: Number(gs.gradePoint),
              description: gs.description,
            })),
          },
        },
        existingScores: existingScores.map((es) => ({
          studentId: es.studentId,
          status: es.status as any,
          isLocked: es.isLocked,
          componentScores: es.componentScores.map((cs) => ({
            componentId: cs.componentId,
            marksObtained: Number(cs.marksObtained),
          })),
        })),
        extension: extension ? { deadline: extension.deadline.toISOString() } : null,
        isPublished: !!publishedSet,
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
    const activeRole = await getActiveSchoolRole(session, schoolSlug);
    const effectiveRole = activeRole?.effectiveRole || "teacher";

    if (
      !["teacher", "admin", "owner", "headteacher"].includes(effectiveRole) &&
      !session.isSuperAdmin
    ) {
      return { success: false, error: "Unauthorized" };
    }

    // Get template for validation and grading
    const template = await prisma.assessmentTemplate.findUnique({
      where: { id: templateId },
      include: {
        components: true,
        gradingSystem: {
          include: { gradeScales: true },
        },
        extensions: {
          where: { classId: classId },
        },
      },
    });

    if (!template) return { success: false, error: "Template not found" };

    // Locking check
    const isGlobalLocked = template.isLocked;
    const now = new Date();
    const isDeadlinePassed = template.deadline && now > template.deadline;
    const extension = template.extensions[0];
    const hasActiveExtension = extension && now <= extension.deadline;

    const isLocked = (isGlobalLocked || isDeadlinePassed) && !hasActiveExtension;

    // Headteachers and admins can bypass locking
    const canBypassLock = ["admin", "owner", "headteacher"].includes(effectiveRole) || session.isSuperAdmin;

    if (isLocked && !canBypassLock) {
      return { 
        success: false, 
        error: "Marks entry is locked for this assessment. Please contact the administrator for an extension." 
      };
    }

    // Check if a ReportCardSet for this class+term has been published
    // If yes, the gradebook is finalized and teachers cannot edit it.
    if (!canBypassLock) {
      const publishedSet = await prisma.reportCardSet.findFirst({
        where: {
          termId,
          status: "PUBLISHED",
          OR: [
            { classId }, // single-class backward compat
            { targetClasses: { some: { classId } } },
          ],
        },
        select: { id: true },
      });
      if (publishedSet) {
        return {
          success: false,
          error: "Report cards for this class and term have been published. The gradebook is now read-only.",
        };
      }
    }

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
            status: req.status || "DRAFT",
          },
          update: {
            templateId, // Update template ID if changed (rare)
            totalScore: percentage,
            percentage: percentage,
            grade,
            gradePoint,
            status: req.status || "DRAFT",
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

    const clsFlat = await prisma.class.findUnique({
      where: { id: classId },
      select: { slug: true },
    });

    revalidatePath(
      `/${schoolSlug}/teacher/classes/${clsFlat?.slug || classId}/gradebook`,
    );

    return { success: true, message: "Marks saved successfully" };
  } catch (error) {
    console.error("[SAVE_MARKS] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save marks",
    };
  }
}
