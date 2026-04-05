"use server";

import { requireSchoolAccess } from "@/lib/auth/guards";
import prisma from "@/lib/prisma";
import { getActiveSchoolRole } from "@/lib/auth/school-access";

export async function getStudentAttendance({
  schoolSlug,
  studentId,
  startDateStr,
  endDateStr,
}: {
  schoolSlug: string;
  studentId: string;
  startDateStr: string;
  endDateStr: string;
}) {
  const session = await requireSchoolAccess(schoolSlug);
  const activeRole = await getActiveSchoolRole(session, schoolSlug);

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
  });

  if (!school) {
    throw new Error("School not found");
  }

  // Validate permission
  let hasPermission = false;

  if (
    activeRole &&
    (activeRole.effectiveRole === "owner" ||
      activeRole.effectiveRole === "admin" ||
      activeRole.effectiveRole === "headteacher")
  ) {
    hasPermission = true;
  }

  // Check if they are the student
  if (!hasPermission) {
    const studentCheck = await prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId: school.id,
        profile: {
          userId: session.user.id,
        },
      },
    });
    if (studentCheck) hasPermission = true;
  }

  // Check if they are a guardian of the student
  if (!hasPermission) {
    const guardianCheck = await prisma.guardianStudent.findFirst({
      where: {
        studentId: studentId,
        guardian: {
          schoolId: school.id,
          profile: {
            userId: session.user.id,
          },
        },
      },
    });
    if (guardianCheck) hasPermission = true;
  }

  if (!hasPermission) {
    throw new Error("Unauthorized to view this student's attendance");
  }

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  const attendances = await prisma.attendance.findMany({
    where: {
      studentId: studentId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      date: "asc",
    },
  });

  const stats = {
    PRESENT: 0,
    ABSENT: 0,
    LATE: 0,
    EXCUSED: 0,
    SICK: 0,
    PERMISSION: 0,
  };

  attendances.forEach((att) => {
    if (att.status in stats) {
      stats[att.status as keyof typeof stats] += 1;
    }
  });

  return {
    attendances,
    stats,
  };
}
