import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ExamsClient } from "./client";
import { ExamDialog } from "@/components/school/examinations/exam-dialog";
import { FileText } from "lucide-react";

interface ExamsPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function ExamsPage(props: ExamsPageProps) {
  const params = await props.params;
  const { schoolSlug } = params;

  const session = await requireSchoolAccess(schoolSlug);
  const role = getSchoolRole(session, schoolSlug);

  if (
    role?.effectiveRole !== "admin" &&
    role?.effectiveRole !== "owner" &&
    !session.isSuperAdmin
  ) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true },
  });

  if (!school) {
    redirect("/");
  }

  const exams = await prisma.assessmentTemplate.findMany({
    where: { schoolId: school.id },
    include: {
      gradingSystem: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          assessmentScores: true,
          components: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const gradingSystems = await prisma.gradingSystem.findMany({
    where: { schoolId: school.id, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="h-8 w-8 text-primary" />
              Examinations
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage examination templates and assessment types
            </p>
          </div>
          <ExamDialog schoolSlug={schoolSlug} gradingSystems={gradingSystems} />
        </div>

        <div className="bg-background rounded-lg border shadow-sm p-4">
          <ExamsClient
            data={exams}
            schoolSlug={schoolSlug}
            gradingSystems={gradingSystems}
          />
        </div>
      </div>
    </div>
  );
}
