import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { LayoutTemplate, ArrowLeft, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { initializeDefaultTemplates } from "./actions";

interface TemplatesPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function TemplatesPage(props: TemplatesPageProps) {
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

  const templates = await prisma.reportCardTemplate.findMany({
    where: { schoolId: school.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/${schoolSlug}/admin/reports/report-cards`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <LayoutTemplate className="h-8 w-8 text-primary" />
              Standardized Templates
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Selection of system-certified report card layouts for your school
            </p>
          </div>
        </div>

        {templates.length === 0 ? (
          <Card className="bg-background/50 border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Zap className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <CardTitle className="text-xl">
                Initialize School Templates
              </CardTitle>
              <CardDescription className="max-w-sm mt-2 text-base">
                Your school currently has no report card templates. Click below
                to install the 3 standardized system-default templates.
              </CardDescription>
              <form
                action={async () => {
                  "use server";
                  await initializeDefaultTemplates(schoolSlug);
                }}
              >
                <Button className="mt-8 px-8" size="lg">
                  Initialize Standard Templates
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-semibold">System Managed Templates</p>
                <p>
                  Custom template creation is restricted to ensure compliance
                  with standardized reporting formats. Select any active
                  template when generating report card sets.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className="group relative overflow-hidden transition-all hover:shadow-lg border-primary/5"
                >
                  <div
                    className={`absolute top-0 left-0 w-full h-1 ${template.isActive ? "bg-primary" : "bg-muted"}`}
                  />
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl font-bold">
                        {template.name}
                      </CardTitle>
                      {template.isActive && (
                        <Badge
                          variant="secondary"
                          className="bg-green-500/10 text-green-600 border-none"
                        >
                          Certified
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="mt-2 text-sm">
                      {template.description || "System-standardized layout"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-muted/30 p-3 rounded-lg flex items-center justify-between text-xs text-muted-foreground">
                      <span>Last Updated</span>
                      <span className="font-mono">
                        {new Date(template.updatedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 text-xs"
                        disabled
                      >
                        View Layout
                      </Button>
                      <Button
                        variant="ghost"
                        className="flex-1 text-xs"
                        disabled
                      >
                        Properties
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
