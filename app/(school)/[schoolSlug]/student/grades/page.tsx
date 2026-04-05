import { requireSchoolAccess } from "@/lib/auth/guards";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { StudentGradesView } from "@/components/shared/grades/student-grades-view";

export default async function StudentGradesPage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  const session = await requireSchoolAccess(schoolSlug);

  const student = await prisma.student.findFirst({
    where: {
      school: { subdomain: schoolSlug },
      profile: { userId: session.user.id },
    },
    include: {
      profile: true,
      assessmentScores: {
        where: {
          isLocked: true // Only show finalized grades
        },
        include: {
          subject: true,
          term: true,
        },
        orderBy: {
          term: { startDate: "desc" }
        }
      },
      reportCards: {
        where: {
          publishedAt: { not: null }
        },
        include: {
          set: {
            include: {
              term: true,
              academicYear: true,
            }
          }
        },
        orderBy: {
          publishedAt: "desc"
        }
      }
    },
  });

  if (!student) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  // Convert Decimals to numbers for client components
  const serializedScores = student.assessmentScores.map((score) => ({
    id: score.id,
    totalScore: Number(score.totalScore),
    percentage: Number(score.percentage),
    grade: score.grade,
    remarks: score.remarks,
    subject: {
      name: score.subject.name,
      code: score.subject.code,
    },
    term: {
      name: score.term.name,
    },
  }));

  const serializedReports = student.reportCards.map((rc) => ({
    id: rc.id,
    publishedAt: rc.publishedAt,
    data: rc.data,
    set: {
      term: { name: rc.set.term.name },
      academicYear: { name: rc.set.academicYear.name },
    },
  }));

  return (
    <div className="space-y-6">
      <StudentGradesView
        schoolSlug={schoolSlug}
        studentName={`${student.profile.firstName} ${student.profile.lastName}`}
        assessmentScores={serializedScores}
        reportCards={serializedReports}
      />
    </div>
  );
}
