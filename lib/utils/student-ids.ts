// lib/utils/student-ids.ts
import prisma from "@/lib/prisma";

/**
 * Generate a unique student ID for a school
 * Format: {schoolCode}-{YY}-{seq:04d}  →  e.g. WIS-26-0001
 */
export async function generateStudentId(
  schoolId: string,
  schoolCode: string,
  year: number,
): Promise<string> {
  const yy = year.toString().slice(-2);
  const prefix = `${schoolCode}-${yy}-`;

  const lastStudent = await prisma.student.findFirst({
    where: {
      schoolId,
      studentId: { startsWith: prefix },
    },
    orderBy: { createdAt: "desc" },
    select: { studentId: true },
  });

  const nextNumber = lastStudent
    ? parseInt(lastStudent.studentId.slice(prefix.length)) + 1
    : 1;

  const seq = isNaN(nextNumber) ? 1 : nextNumber;
  return `${prefix}${seq.toString().padStart(4, "0")}`;
}

/**
 * Generate a unique admission number for a school.
 * Format: {YY}{seq:04d}  →  e.g. 260001, 260002
 *
 * 6 digits total where the first two are the year.
 */
export async function generateAdmissionNumber(
  schoolId: string,
  admYear: number,
): Promise<string> {
  const yy = admYear.toString().slice(-2); // e.g. "26"

  const lastAdmission = await prisma.student.findFirst({
    where: {
      schoolId,
      admissionNumber: { startsWith: yy },
    },
    orderBy: { createdAt: "desc" },
    select: { admissionNumber: true },
  });

  let nextNumber: number;
  if (lastAdmission?.admissionNumber) {
    const seq = parseInt(lastAdmission.admissionNumber.slice(yy.length));
    nextNumber = isNaN(seq) ? 1 : seq + 1;
  } else {
    nextNumber = 1;
  }

  return `${yy}${nextNumber.toString().padStart(4, "0")}`;
}

/**
 * Generate multiple student IDs and admission numbers in batch.
 * Used for bulk upload operations.
 *
 * Student ID format: {schoolCode}-{YY}-{seq:04d}
 * Admission number format: {YY}{seq:04d}
 */
export async function batchGenerateStudentIds(
  schoolId: string,
  schoolCode: string,
  admYear: number,
  count: number,
): Promise<Array<{ studentId: string; admissionNumber: string }>> {
  const yy = admYear.toString().slice(-2);
  const stuPrefix = `${schoolCode}-${yy}-`;
  const admPrefix = yy;

  // Get the last student for this school & year to determine starting sequences
  const lastStudent = await prisma.student.findFirst({
    where: {
      schoolId,
      OR: [
        { studentId: { startsWith: stuPrefix } },
        { admissionNumber: { startsWith: admPrefix } },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: { studentId: true, admissionNumber: true },
  });

  // Starting student sequence
  let startStudentNumber: number = 1;
  if (lastStudent?.studentId?.startsWith(stuPrefix)) {
    const seq = parseInt(lastStudent.studentId.slice(stuPrefix.length));
    startStudentNumber = isNaN(seq) ? 1 : seq + 1;
  }

  // Starting admission sequence
  let startAdmissionNumber: number = 1;
  if (lastStudent?.admissionNumber?.startsWith(admPrefix)) {
    const seq = parseInt(lastStudent.admissionNumber.slice(admPrefix.length));
    startAdmissionNumber = isNaN(seq) ? 1 : seq + 1;
  }

  // Generate all IDs
  const ids = [];
  for (let i = 0; i < count; i++) {
    ids.push({
      studentId: `${stuPrefix}${(startStudentNumber + i).toString().padStart(4, "0")}`,
      admissionNumber: `${admPrefix}${(startAdmissionNumber + i).toString().padStart(4, "0")}`,
    });
  }

  return ids;
}
