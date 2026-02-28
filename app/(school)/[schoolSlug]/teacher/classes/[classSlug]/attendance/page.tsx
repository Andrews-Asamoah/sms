import { requireSchoolAccess } from "@/lib/auth/guards";
import prisma from "@/lib/prisma";
import { AttendanceClient } from "./attendance-client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { startOfDay } from "date-fns";

interface AttendancePageProps {
  params: Promise<{
    schoolSlug: string;
    classSlug: string;
  }>;
}

export default async function AttendancePage({ params }: AttendancePageProps) {
  const { schoolSlug, classSlug } = await params;

  // 1. Auth check
  const session = await requireSchoolAccess(schoolSlug);

  // 2. Fetch Class Details
  const classData = await prisma.class.findFirst({
    where: {
      OR: [{ slug: classSlug }, { id: classSlug }],
      school: { subdomain: schoolSlug },
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!classData) {
    notFound();
  }

  // 3. Fetch Students in this class
  const students = await prisma.student.findMany({
    where: {
      school: { subdomain: schoolSlug },
      status: "ACTIVE",
      OR: [
        { enrollments: { some: { classId: classData.id, status: "ACTIVE" } } },
        { classId: classData.id },
      ],
    },
    select: {
      id: true,
      profile: {
        select: {
          firstName: true,
          lastName: true,
          user: {
            select: {
              image: true,
            },
          },
        },
      },
      admissionNumber: true,
    },
    orderBy: {
      profile: {
        lastName: "asc",
      },
    },
  });

  // 4. Fetch Today's Attendance
  const today = startOfDay(new Date());
  const existingAttendance = await prisma.attendance.findMany({
    where: {
      date: today,
      studentId: {
        in: students.map((s) => s.id),
      },
    },
  });

  // 5. Normalize data for client
  const normalizedStudents = students.map((s) => ({
    id: s.id,
    firstName: s.profile.firstName,
    lastName: s.profile.lastName,
    admissionNumber: s.admissionNumber,
    image: s.profile.user.image,
  }));

  const attendanceMap = Object.fromEntries(
    existingAttendance.map((a) => [
      a.studentId,
      {
        status: a.status as any,
        remarks: a.remarks || undefined,
      },
    ]),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/${schoolSlug}/teacher/classes`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {classData.name} - Attendance
            </h1>
            <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">
            Mark daily attendance for students in {classData.name}
          </p>
        </div>
      </div>

      <AttendanceClient
        schoolSlug={schoolSlug}
        classSlug={classSlug}
        classId={classData.id}
        students={normalizedStudents}
        initialAttendance={attendanceMap}
      />
    </div>
  );
}
