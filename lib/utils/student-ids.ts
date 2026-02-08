// lib/utils/student-ids.ts
import prisma from "@/lib/prisma";

/**
 * Generate a unique student ID for a school
 * Format: STU00001, STU00002, etc.
 */
export async function generateStudentId(schoolId: string): Promise<string> {
  const lastStudent = await prisma.student.findFirst({
    where: { schoolId },
    orderBy: { createdAt: "desc" },
    select: { studentId: true },
  });

  const nextNumber = lastStudent
    ? parseInt(lastStudent.studentId.replace(/\D/g, "")) + 1
    : 1;

  return `STU${nextNumber.toString().padStart(5, "0")}`;
}

/**
 * Generate a unique admission number for a school
 * Format: {schoolCode}0001, {schoolCode}0002, etc.
 */
export async function generateAdmissionNumber(
  schoolId: string,
  schoolCode: string,
): Promise<string> {
  const lastAdmission = await prisma.student.findFirst({
    where: {
      schoolId,
      admissionNumber: { not: null },
    },
    orderBy: { createdAt: "desc" },
    select: { admissionNumber: true },
  });

  let nextNumber: number;
  if (lastAdmission?.admissionNumber) {
    const lastNumber = parseInt(
      lastAdmission.admissionNumber.replace(/\D/g, ""),
    );
    nextNumber = isNaN(lastNumber) ? 1 : lastNumber + 1;
  } else {
    nextNumber = 1;
  }

  return `${schoolCode}${nextNumber.toString().padStart(4, "0")}`;
}

/**
 * Generate multiple student IDs and admission numbers in batch
 * Used for bulk upload operations
 */
export async function batchGenerateStudentIds(
  schoolId: string,
  schoolCode: string,
  count: number,
): Promise<Array<{ studentId: string; admissionNumber: string }>> {
  // Get the last student to determine starting numbers
  const lastStudent = await prisma.student.findFirst({
    where: { schoolId },
    orderBy: { createdAt: "desc" },
    select: { studentId: true, admissionNumber: true },
  });

  // Determine starting student number
  const startStudentNumber = lastStudent
    ? parseInt(lastStudent.studentId.replace(/\D/g, "")) + 1
    : 1;

  // Determine starting admission number
  let startAdmissionNumber: number;
  if (lastStudent?.admissionNumber) {
    const lastAdmNumber = parseInt(
      lastStudent.admissionNumber.replace(/\D/g, ""),
    );
    startAdmissionNumber = isNaN(lastAdmNumber) ? 1 : lastAdmNumber + 1;
  } else {
    startAdmissionNumber = 1;
  }

  // Generate all IDs
  const ids = [];
  for (let i = 0; i < count; i++) {
    const studentNumber = startStudentNumber + i;
    const admissionNumber = startAdmissionNumber + i;

    ids.push({
      studentId: `STU${studentNumber.toString().padStart(5, "0")}`,
      admissionNumber: `${schoolCode}${admissionNumber.toString().padStart(4, "0")}`,
    });
  }

  return ids;
}
