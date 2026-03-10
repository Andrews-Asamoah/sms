"use server";

import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { revalidatePath } from "next/cache";
import { AttendanceStatus } from "@/lib/generated/prisma/client";

interface AttendanceEntry {
  studentId: string;
  status: AttendanceStatus;
  remarks?: string;
}

export async function saveAttendanceBatch(
  schoolSlug: string,
  classSlug: string,
  date: Date,
  entries: AttendanceEntry[],
) {
  try {
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    const isAdmin = 
      role?.effectiveRole === "admin" || 
      role?.effectiveRole === "owner" || 
      session.isSuperAdmin;

    // Fetch class to check teacher
    const classData = await prisma.class.findFirst({
      where: {
        OR: [{ slug: classSlug }, { id: classSlug }],
        school: { subdomain: schoolSlug },
      },
      select: { id: true, classTeacherId: true, schoolId: true },
    });

    if (!classData) {
      return { success: false, error: "Class not found" };
    }

    if (!isAdmin) {
      const teacher = await prisma.teacher.findFirst({
        where: {
          schoolId: classData.schoolId,
          profile: { userId: session.user.id }
        },
        select: { id: true }
      });

      if (!teacher || classData.classTeacherId !== teacher.id) {
        return { success: false, error: "Only the Class Teacher can mark attendance" };
      }
    }

    // Use a transaction to save all entries
    await prisma.$transaction(async (tx) => {
      for (const entry of entries) {
        await tx.attendance.upsert({
          where: {
            studentId_date: {
              studentId: entry.studentId,
              date: date,
            },
          },
          update: {
            status: entry.status,
            remarks: entry.remarks,
            markedById: session.user.id,
            updatedAt: new Date(),
          },
          create: {
            studentId: entry.studentId,
            date: date,
            status: entry.status,
            remarks: entry.remarks,
            markedById: session.user.id,
          },
        });
      }
    });

    revalidatePath(`/${schoolSlug}/teacher/classes/${classSlug}/attendance`);
    return { success: true };
  } catch (error) {
    console.error("[SAVE_ATTENDANCE] Error:", error);
    return { success: false, error: "Failed to save attendance" };
  }
}

export async function getAttendanceForDate(
  schoolSlug: string,
  classId: string,
  date: Date,
) {
  try {
    const attendances = await prisma.attendance.findMany({
      where: {
        date: date,
        student: {
          classId: classId,
          school: { subdomain: schoolSlug },
        },
      },
      select: {
        studentId: true,
        status: true,
        remarks: true,
      },
    });
    return { success: true, data: attendances };
  } catch (error) {
    console.error("[GET_ATTENDANCE] Error:", error);
    return { success: false, error: "Failed to fetch attendance" };
  }
}

export async function getMarkedDates(schoolSlug: string, classId: string) {
  try {
    await requireSchoolAccess(schoolSlug);

    const markedDates = await prisma.attendance.findMany({
      where: {
        student: {
          classId: classId,
          school: { subdomain: schoolSlug },
        },
      },
      select: {
        date: true,
      },
      distinct: ["date"],
    });

    return {
      success: true,
      data: markedDates.map((d) => d.date),
    };
  } catch (error) {
    console.error("[GET_MARKED_DATES] Error:", error);
    return { success: false, error: "Failed to fetch marked dates" };
  }
}
