import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Archive,
  AlertCircle,
  Percent,
  ArrowLeft,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AssessmentTemplateDialog } from "@/components/school/grading/assessment-template-dialog";
import { AssessmentTemplateActions } from "@/components/school/grading/assessment-template-actions";

interface AssessmentTemplatesPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function AssessmentTemplatesPage({
  params,
}: AssessmentTemplatesPageProps) {
  const { schoolSlug } = await params;

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
    return <div>School not found</div>;
  }

  // Fetch templates, grading systems, and current classes
  const [templates, gradingSystems, schoolClasses] = await Promise.all([
    prisma.assessmentTemplate.findMany({
      where: { schoolId: school.id },
      include: {
        gradingSystem: true,
        components: {
          orderBy: { displayOrder: "asc" },
        },
        classes: {
          select: { classId: true },
        },
        _count: {
          select: { assessmentScores: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.gradingSystem.findMany({
      where: {
        OR: [{ schoolId: school.id }, { isSystemDefault: true }],
        isActive: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.class.findMany({
      where: {
        schoolId: school.id,
        academicYear: { isCurrent: true },
        isActive: true,
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/${schoolSlug}/admin/academics/grading`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Assessment Templates
            </h1>
            <p className="text-muted-foreground mt-1">
              Define structure and weights for assessments (e.g., Mid-term 30%,
              Exam 70%)
            </p>
          </div>
        </div>
        <AssessmentTemplateDialog
          schoolSlug={schoolSlug}
          gradingSystems={gradingSystems}
          classes={schoolClasses}
        >
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </AssessmentTemplateDialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id} className="flex flex-col">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  {template.name}
                  {!template.isActive && (
                    <Badge variant="secondary" className="text-xs">
                      Inactive
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="mt-1 line-clamp-2">
                  {template.description || "No description"}
                </CardDescription>
              </div>
              <AssessmentTemplateActions
                template={template}
                schoolSlug={schoolSlug}
                gradingSystems={gradingSystems}
                classes={schoolClasses}
              />
            </CardHeader>
            <CardContent className="flex-1 mt-4">
              <div className="space-y-4">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Archive className="mr-2 h-4 w-4" />
                  Grading: {template.gradingSystem.name}
                </div>

                {template.classLevel && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Archive className="mr-2 h-4 w-4" />
                    Class Level: {template.classLevel}
                  </div>
                )}

                {template.subjectCode && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Subject: {template.subjectCode}
                  </div>
                )}

                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-3">Components</p>
                  <div className="space-y-2">
                    {template.components.map((comp) => (
                      <div
                        key={comp.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-muted-foreground">
                          {comp.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono">
                            {Number(comp.maxMarks)} pts
                          </Badge>
                          <Badge
                            variant="secondary"
                            className="bg-primary/10 text-primary hover:bg-primary/20"
                          >
                            {Number(comp.weight)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {template._count.assessmentScores > 0 && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded mt-2">
                    <AlertCircle className="h-3 w-3" />
                    Used in {template._count.assessmentScores} assessments
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {templates.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-lg bg-muted/20">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Percent className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">No templates defined</h3>
            <p className="text-muted-foreground max-w-sm mb-6">
              Create assessment templates to define how student marks are
              calculated for different subjects or classes.
            </p>
            <AssessmentTemplateDialog
              schoolSlug={schoolSlug}
              gradingSystems={gradingSystems}
              classes={schoolClasses}
            >
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create First Template
              </Button>
            </AssessmentTemplateDialog>
          </div>
        )}
      </div>
    </div>
  );
}
