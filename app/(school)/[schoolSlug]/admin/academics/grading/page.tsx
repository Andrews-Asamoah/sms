import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { GradingSystemsClient } from "./client";
import { GradingSystemDialog } from "@/components/school/grading/grading-system-dialog";
import { TrendingUp } from "lucide-react";

interface GradingPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function GradingPage(props: GradingPageProps) {
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

  const [gradingSystemsRaw, systemDefaultsRaw] = await Promise.all([
    prisma.gradingSystem.findMany({
      where: { schoolId: school.id },
      include: {
        gradeScales: {
          orderBy: { displayOrder: "asc" },
        },
        _count: {
          select: {
            gradeScales: true,
            assessmentTemplates: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.gradingSystem.findMany({
      where: { isSystemDefault: true },
      include: {
        gradeScales: {
          orderBy: { displayOrder: "asc" },
        },
        _count: {
          select: {
            gradeScales: true,
            assessmentTemplates: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  // Convert Decimal to Number for serialization to Client Component
  const serializeSystems = (systems: any[]) => systems.map((gs) => ({
    ...gs,
    gradeScales: gs.gradeScales.map((scale: any) => ({
      ...scale,
      minScore: Number(scale.minScore),
      maxScore: Number(scale.maxScore),
      gradePoint: Number(scale.gradePoint),
    })),
  }));

  const gradingSystems = serializeSystems(gradingSystemsRaw);
  const systemDefaults = serializeSystems(systemDefaultsRaw);

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <TrendingUp className="h-8 w-8 text-primary" />
              Grading Systems
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage grading scales and assessment criteria
            </p>
          </div>
          <GradingSystemDialog schoolSlug={schoolSlug} />
        </div>

        <div className="bg-background rounded-lg border shadow-sm p-4 hidden">
          {/* Legacy single list block removed; Client now handles both */}
        </div>

        <GradingSystemsClient data={gradingSystems} systemDefaults={systemDefaults} schoolSlug={schoolSlug} />
      </div>
    </div>
  );
}
