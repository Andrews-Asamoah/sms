import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { TeacherClassesClient } from "./classes-client";

interface ClassesPageProps {
  params: Promise<{
    schoolSlug: string;
  }>;
}

export default async function TeacherClassesPage({ params }: ClassesPageProps) {
  const { schoolSlug } = await params;

  // 1. Auth check
  const session = await requireSchoolAccess(schoolSlug);
  const role = getSchoolRole(session, schoolSlug);

  // 2. Get Teacher ID lookup (same logic as gradebook)
  let teacherId: string | undefined;

  if (role?.effectiveRole === "teacher") {
    const teacher = await prisma.teacher.findFirst({
      where: {
        school: { subdomain: schoolSlug },
        profile: { userId: session.user.id },
      },
      select: { id: true },
    });
    teacherId = teacher?.id;
  }

  // 3. Fetch Classes
  // A teacher is interested in classes where they are the head class teacher
  // OR where they teach a subject.
  const classes = await prisma.class.findMany({
    where: {
      school: { subdomain: schoolSlug },
      isActive: true,
      OR: [
        // Role-based logic: Admins see everything, teachers see assigned
        ...(teacherId
          ? [
              { classTeacherId: teacherId },
              {
                subjects: {
                  some: {
                    teacherId: teacherId,
                  },
                },
              },
            ]
          : !session.isSuperAdmin &&
              role?.effectiveRole !== "admin" &&
              role?.effectiveRole !== "owner"
            ? [{ id: "none" }] // Fallback if no specific role found
            : []),
      ],
    },
    include: {
      _count: {
        select: {
          students: true,
        },
      },
      academicYear: {
        select: {
          name: true,
        },
      },
      subjects: {
        include: {
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  // 4. Normalize data for client
  const normalizedClasses = classes.map((cls) => {
    // Determine which subjects the teacher teaches in this class
    const teacherSubjects = cls.subjects
      .filter((cs) => !teacherId || cs.teacherId === teacherId)
      .map((cs) => ({
        id: cs.subject.id,
        name: cs.subject.name,
        code: cs.subject.code,
      }));

    return {
      id: cls.id,
      name: cls.name,
      slug: cls.slug,
      level: cls.level,
      studentCount: cls._count.students,
      isClassTeacher: cls.classTeacherId === teacherId,
      subjects: teacherSubjects,
      academicYear: cls.academicYear.name,
    };
  });

  return (
    <div className="container py-6">
      <TeacherClassesClient
        schoolSlug={schoolSlug}
        classes={normalizedClasses}
      />
    </div>
  );
}
