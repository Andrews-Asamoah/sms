// app/(school)/[schoolSlug]/teacher/classes/[classId]/gradebook/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole, getActiveSchoolRole } from "@/lib/auth/school-access";
import { randomUUID } from "crypto";

interface SaveMarksData {
  studentId: string;
  componentScores: {
    componentId: string;
    marks: number | (number | "")[]; // array for repeatable components
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

export interface MarksDataResult {
  students: {
    id: string;
    admissionNumber: string | null;
    user: {
      firstName: string;
      lastName: string;
      otherNames: string | null;
      email: string | null;
      image: string | null;
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
      maxMarks: number;
      weight: number;
      displayOrder: number;
      isRepeatable: boolean;
      expectedCount: number;
    }[];
    gradingSystem: {
      gradeScales: {
        id: string;
        grade: string;
        minScore: number;
        maxScore: number;
        gradePoint: number;
        description: string | null;
      }[];
    };
  };
  existingScores: {
    studentId: string;
    status: "DRAFT" | "SUBMITTED" | "REVIEWED" | "FINAL";
    isLocked: boolean;
    remarks: string | null;
    componentScores: {
      componentId: string;
      marksObtained: number;
      rawScores: any; // Prisma JsonValue maps to any in the frontend types
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
    // Logic: Try to find specific template for this class (direct or join table),
    // fallback to (ClassLevel + Subject), fallback to ClassLevel only, fallback to Subject only,
    // and finally fallback to school-wide default.

    // Priority 1: Specific template linked to this class ID (directly or via the classes join table)
    let template = await prisma.assessmentTemplate.findFirst({
      where: {
        school: { subdomain: schoolSlug },
        isActive: true,
        OR: [
          { classId: classId },
          { classes: { some: { classId: classId } } },
        ],
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

    // Fallback 1: specific template matching both class level and subject code
    if (!template && classData.level && subjectData.code) {
      template = await prisma.assessmentTemplate.findFirst({
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
    }

    // Fallback 2: specific template matching class level
    if (!template && classData.level) {
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

    // Fallback 3: specific template matching subject code
    if (!template && subjectData.code) {
      template = await prisma.assessmentTemplate.findFirst({
        where: {
          school: { subdomain: schoolSlug },
          isActive: true,
          subjectCode: subjectData.code,
          classLevel: null,
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

    // Fallback 4: Global School-wide template (neither class nor subject restricted)
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
        where: {
          subjectId,
          termId,
          templateId: template.id,
          studentId: { in: students.map((s) => s.id) },
        },
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
          user: {
            firstName: s.profile.firstName,
            lastName: s.profile.lastName,
            otherNames: s.profile.otherNames,
            email: s.profile.user.email,
            image: s.profile.user.image,
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
            isRepeatable: c.isRepeatable,
            expectedCount: c.expectedCount,
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
          remarks: es.remarks,
          componentScores: es.componentScores.map((cs) => ({
            componentId: cs.componentId,
            marksObtained: Number(cs.marksObtained),
            rawScores: cs.rawScores,
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

    // Process each student's marks in a single roundtrip batch
    const studentIds = marks.map((m) => m.studentId);
    const existingScores = await prisma.assessmentScore.findMany({
      where: {
        subjectId,
        termId,
        templateId,
        studentId: { in: studentIds },
      },
      include: {
        componentScores: true,
      },
    });

    const ops: any[] = [];
    const componentScoresToCreate: any[] = [];
    const scoreIdsToDelete = existingScores.map((es) => es.id);

    // 1. Delete existing component scores first to avoid conflicts and allow fresh creation
    if (scoreIdsToDelete.length > 0) {
      ops.push(
        prisma.componentScore.deleteMany({
          where: {
            assessmentScoreId: { in: scoreIdsToDelete },
          },
        })
      );
    }

    for (const studentEntry of marks) {
      let totalWeightedScore = 0;
      let totalMaxWeight = 0; // To normalize if needed, but assuming 100%

      // Calculate totals
      for (const compScore of studentEntry.componentScores) {
        const component = template.components.find(
          (c) => c.id === compScore.componentId,
        );
        if (component) {
          let processedMarks = 0;
          const maxMarks = Number(component.maxMarks);

          if (Array.isArray(compScore.marks)) {
            // Averaged occurrences
            const validScores = compScore.marks.filter(m => typeof m === "number") as number[];
            if (validScores.length > 0) {
              // Check if any single score exceeds maxMarks
              for (const score of validScores) {
                if (score > maxMarks) {
                   throw new Error(`Marks entered for student ${studentEntry.studentId} exceed max marks for ${component.name}`);
                }
              }
              const sum = validScores.reduce((acc, val) => acc + val, 0);
              processedMarks = sum / validScores.length; 
            }
          } else {
            processedMarks = Number(compScore.marks);
            if (processedMarks > maxMarks) {
               throw new Error(`Marks entered for student ${studentEntry.studentId} exceed max marks for ${component.name}`);
            }
          }

          const weight = Number(component.weight);
          const weighted = (processedMarks / maxMarks) * weight;
          totalWeightedScore += weighted;
          totalMaxWeight += weight;
        }
      }

      // Determine Grade
      const percentage = totalWeightedScore; // Assuming sum of weights is 100

      let grade = "F";
      let gradePoint = 0;

      // Find matching grade scale
      const scale = template.gradingSystem.gradeScales.find(
        (s) =>
          percentage >= Number(s.minScore) &&
          percentage <= Number(s.maxScore),
      );

      if (scale) {
        grade = scale.grade;
        gradePoint = Number(scale.gradePoint);
      }

      const existingScore = existingScores.find(
        (es) => es.studentId === studentEntry.studentId,
      );
      const scoreId = existingScore ? existingScore.id : randomUUID();

      // Upsert AssessmentScore (separated into explicit create/update calls)
      if (existingScore) {
        ops.push(
          prisma.assessmentScore.update({
            where: { id: scoreId },
            data: {
              totalScore: percentage,
              percentage: percentage,
              grade,
              gradePoint,
              status: req.status || "DRAFT",
              remarks: null,
              updatedAt: new Date(),
            },
          })
        );
      } else {
        ops.push(
          prisma.assessmentScore.create({
            data: {
              id: scoreId,
              studentId: studentEntry.studentId,
              subjectId,
              termId,
              templateId,
              totalScore: percentage,
              percentage: percentage,
              grade,
              gradePoint,
              status: req.status || "DRAFT",
            },
          })
        );
      }

      // Prepare ComponentScores to be created
      for (const compScore of studentEntry.componentScores) {
        const component = template.components.find(
          (c) => c.id === compScore.componentId,
        );
        if (!component) continue;

        let finalMarks = 0;
        let rawScoresJson: any = null;

        if (Array.isArray(compScore.marks)) {
          const validScores = compScore.marks.filter(m => typeof m === "number") as number[];
          if (validScores.length > 0) {
            const sum = validScores.reduce((acc, val) => acc + val, 0);
            finalMarks = sum / validScores.length;
          }
          rawScoresJson = compScore.marks;
        } else {
          finalMarks = Number(compScore.marks);
        }

        const weight = Number(component.weight);
        const maxMarks = Number(component.maxMarks);
        const weighted = (finalMarks / maxMarks) * weight;
        const percentageComp = (finalMarks / maxMarks) * 100;

        componentScoresToCreate.push({
          id: randomUUID(),
          assessmentScoreId: scoreId,
          componentId: compScore.componentId,
          occurrenceIndex: 0,
          marksObtained: finalMarks,
          maxMarks: maxMarks,
          percentage: percentageComp,
          weightedScore: weighted,
          rawScores: rawScoresJson,
          recordedById: session.user.id,
        });
      }
    }

    // 2. Batch insert component scores
    if (componentScoresToCreate.length > 0) {
      ops.push(
        prisma.componentScore.createMany({
          data: componentScoresToCreate,
        })
      );
    }

    // Execute all database operations in a single database transaction batch
    await prisma.$transaction(ops, {
      maxWait: 15000,
      timeout: 60000,
    });

    const clsFlat = await prisma.class.findUnique({
      where: { id: classId },
      select: { slug: true, schoolId: true },
    });

    revalidatePath(
      `/${schoolSlug}/teacher/classes/${clsFlat?.slug || classId}/gradebook`,
    );
    if (clsFlat?.schoolId) {
      revalidatePath(`/${schoolSlug}/admin/reports/gradebook-tracking`);
    }

    return { success: true, message: "Marks saved successfully" };
  } catch (error) {
    console.error("[SAVE_MARKS] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save marks",
    };
  }
}

// ============================================================================
// SUBMIT FOR REVIEW (lightweight — status update only, no marks reprocessing)
// ============================================================================

export async function submitGradebookForReview(req: {
  schoolSlug: string;
  classId: string;
  subjectId: string;
  termId: string;
  templateId: string;
}) {
  try {
    const { schoolSlug, classId, subjectId, termId, templateId } = req;
    const session = await requireSchoolAccess(schoolSlug);
    const activeRole = await getActiveSchoolRole(session, schoolSlug);
    const effectiveRole = activeRole?.effectiveRole || "teacher";

    if (!["teacher", "admin", "owner", "headteacher"].includes(effectiveRole) && !session.isSuperAdmin) {
      return { success: false, error: "Unauthorized" };
    }

    // Only update records that are in DRAFT status — do NOT demote REVIEWED/FINAL records
    const updated = await prisma.assessmentScore.updateMany({
      where: {
        subjectId,
        termId,
        templateId,
        student: {
          OR: [
            { classId },
            { enrollments: { some: { classId, status: "ACTIVE" } } },
          ],
        },
        status: "DRAFT",
      },
      data: {
        status: "SUBMITTED",
        updatedAt: new Date(),
      },
    });

    if (updated.count === 0) {
      // Check if already submitted (no DRAFT records to promote)
      const existing = await prisma.assessmentScore.count({
        where: {
          subjectId,
          termId,
          templateId,
          student: {
            OR: [
              { classId },
              { enrollments: { some: { classId, status: "ACTIVE" } } },
            ],
          },
        },
      });

      if (existing === 0) {
        return { success: false, error: "No marks have been saved yet. Please save marks before submitting." };
      }

      // Records exist but none were DRAFT — already submitted or higher status
      return { success: true, message: "Gradebook has already been submitted for review." };
    }

    const clsFlat = await prisma.class.findUnique({
      where: { id: classId },
      select: { slug: true, schoolId: true },
    });

    revalidatePath(`/${schoolSlug}/teacher/classes/${clsFlat?.slug || classId}/gradebook`);
    revalidatePath(`/${schoolSlug}/admin/reports/gradebook-tracking`);

    return { success: true, message: `Gradebook submitted for review (${updated.count} student records updated)` };
  } catch (error) {
    console.error("[SUBMIT_FOR_REVIEW] Error:", error);
    return { success: false, error: "Failed to submit gradebook for review" };
  }
}

// ============================================================================
// REVIEW GRADEBOOK SUBMISSION
// ============================================================================

export async function reviewGradebookSubmission(req: {
  schoolSlug: string;
  classId: string;
  subjectId: string;
  termId: string;
  status: "DRAFT" | "REVIEWED" | "FINAL";
  remarks?: string;
}) {
  try {
    const { schoolSlug, classId, subjectId, termId, status, remarks } = req;

    // Auth check
    const session = await requireSchoolAccess(schoolSlug);
    const activeRole = await getActiveSchoolRole(session, schoolSlug);
    const effectiveRole = activeRole?.effectiveRole || "teacher";

    // Admins, Owners, and Headteachers can always review
    let isAuthorized = ["admin", "owner", "headteacher"].includes(effectiveRole) || session.isSuperAdmin;

    // If not a global admin/headteacher, check if they are the HOD for this class's department
    if (!isAuthorized && effectiveRole === "teacher") {
      const hodDepartment = await prisma.department.findFirst({
        where: {
          headOfDept: { profile: { userId: session.user.id } },
          classes: { some: { id: classId } }
        }
      });
      if (hodDepartment) isAuthorized = true;
    }

    if (!isAuthorized) {
      return { success: false, error: "Unauthorized to review gradebook submissions" };
    }

    // Update all assessment scores for this subject, class, and term
    await prisma.assessmentScore.updateMany({
      where: {
        subjectId,
        termId,
        student: {
          OR: [
            { classId },
            { enrollments: { some: { classId, status: "ACTIVE" } } },
          ],
        },
      },
      data: {
        status,
        remarks: remarks || null,
        updatedAt: new Date()
      }
    });

    const clsFlat = await prisma.class.findUnique({
      where: { id: classId },
      select: { slug: true, schoolId: true },
    });

    revalidatePath(
      `/${schoolSlug}/teacher/classes/${clsFlat?.slug || classId}/gradebook`,
    );
    revalidatePath(`/${schoolSlug}/admin/reports/gradebook-tracking`);

    return { 
      success: true, 
      message: status === "DRAFT" 
        ? "Submission rejected and sent back to teacher" 
        : `Gradebook ${status.toLowerCase()} successfully` 
    };
  } catch (error) {
    console.error("[REVIEW_GRADEBOOK] Error:", error);
    return { success: false, error: "Failed to review gradebook submission" };
  }
}

export async function requestGradebookEdit(req: {
  schoolSlug: string;
  classId: string;
  subjectId: string;
  termId: string;
  reason: string;
}) {
  try {
    const { schoolSlug, classId, subjectId, termId, reason } = req;
    const session = await requireSchoolAccess(schoolSlug);

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true, name: true }
    });

    if (!school) return { success: false, error: "School not found" };

    // 1. Find the Class, Subject, and HOD
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        department: {
          select: {
            headOfDept: {
              select: { profile: { select: { userId: true } } }
            }
          }
        }
      }
    });

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      select: { name: true }
    });

    if (!classData || !subject) return { success: false, error: "Class or Subject not found" };

    // 2. Identify Recipient User IDs
    const recipientIds = new Set<string>();

    // Add School Admins & Owners ONLY
    const administrators = await prisma.member.findMany({
      where: {
        organization: { school: { subdomain: schoolSlug } },
        role: { in: ["admin", "owner"] }
      },
      select: { userId: true }
    });

    administrators.forEach(admin => recipientIds.add(admin.userId));

    // Exclude the requesting teacher from getting their own notification
    recipientIds.delete(session.user.id);

    // 3. Create Notifications
    const notificationTitle = `Gradebook Edit Request: ${classData.name}`;
    const notificationMessage = `${session.user.name} is requesting to edit the finalized gradebook for ${subject.name}. Reason: ${reason}`;
    const link = `/${schoolSlug}/admin/reports/gradebook-tracking/review?classId=${classId}&subjectId=${subjectId}&termId=${termId}`;

    await prisma.notification.createMany({
      data: Array.from(recipientIds).map(userId => ({
        schoolId: school.id,
        userId,
        type: "GENERAL",
        title: notificationTitle,
        message: notificationMessage,
        link,
      }))
    });

    return { success: true, message: "Edit request sent to administrators" };
  } catch (error) {
    console.error("[REQUEST_EDIT] Error:", error);
    return { success: false, error: "Failed to send edit request" };
  }
}
