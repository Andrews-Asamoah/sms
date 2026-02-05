// lib/utils/student-ids.ts
import prisma from "@/lib/prisma";

/**
 * Generate next student ID for a school
 * Format: STU + 5-digit number (e.g., STU00001, STU00002)
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
 * Generate next admission number for a school
 * Format: SchoolCode + 4-digit number (e.g., ABC0001, ABC0002)
 */
export async function generateAdmissionNumber(
  schoolId: string,
  schoolCode: string,
): Promise<string> {
  const lastStudent = await prisma.student.findFirst({
    where: {
      schoolId,
      admissionNumber: { not: null },
    },
    orderBy: { createdAt: "desc" },
    select: { admissionNumber: true },
  });

  let nextNumber = 1;
  if (lastStudent?.admissionNumber) {
    const lastNumber = parseInt(lastStudent.admissionNumber.replace(/\D/g, ""));
    nextNumber = isNaN(lastNumber) ? 1 : lastNumber + 1;
  }

  return `${schoolCode}${nextNumber.toString().padStart(4, "0")}`;
}

/**
 * Batch generate student IDs and admission numbers
 * Useful for bulk uploads - generates all IDs upfront to ensure sequential numbering
 */
export async function batchGenerateStudentIds(
  schoolId: string,
  schoolCode: string,
  count: number,
): Promise<Array<{ studentId: string; admissionNumber: string }>> {
  // Get the last used numbers
  const [lastStudent, lastAdmission] = await Promise.all([
    prisma.student.findFirst({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
      select: { studentId: true },
    }),
    prisma.student.findFirst({
      where: {
        schoolId,
        admissionNumber: { not: null },
      },
      orderBy: { createdAt: "desc" },
      select: { admissionNumber: true },
    }),
  ]);

  const startStudentNumber = lastStudent
    ? parseInt(lastStudent.studentId.replace(/\D/g, "")) + 1
    : 1;

  let startAdmissionNumber = 1;
  if (lastAdmission?.admissionNumber) {
    const lastNumber = parseInt(
      lastAdmission.admissionNumber.replace(/\D/g, ""),
    );
    startAdmissionNumber = isNaN(lastNumber) ? 1 : lastNumber + 1;
  }

  // Generate the batch
  const ids = [];
  for (let i = 0; i < count; i++) {
    ids.push({
      studentId: `STU${(startStudentNumber + i).toString().padStart(5, "0")}`,
      admissionNumber: `${schoolCode}${(startAdmissionNumber + i).toString().padStart(4, "0")}`,
    });
  }

  return ids;
}

/**
 * Validate student ID format
 */
export function isValidStudentId(studentId: string): boolean {
  return /^STU\d{5}$/.test(studentId);
}

/**
 * Validate admission number format
 */
export function isValidAdmissionNumber(
  admissionNumber: string,
  schoolCode: string,
): boolean {
  const pattern = new RegExp(`^${schoolCode}\\d{4}$`);
  return pattern.test(admissionNumber);
}

/**
 * Check if student ID already exists in a school
 */
export async function isStudentIdTaken(
  studentId: string,
  schoolId: string,
): Promise<boolean> {
  const existing = await prisma.student.findFirst({
    where: {
      studentId,
      schoolId,
    },
  });
  return !!existing;
}

/**
 * Check if admission number already exists in a school
 */
export async function isAdmissionNumberTaken(
  admissionNumber: string,
  schoolId: string,
): Promise<boolean> {
  const existing = await prisma.student.findFirst({
    where: {
      admissionNumber,
      schoolId,
    },
  });
  return !!existing;
}
