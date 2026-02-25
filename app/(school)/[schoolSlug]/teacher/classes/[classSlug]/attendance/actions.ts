"use server";

import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
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
