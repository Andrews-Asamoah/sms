import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import {
  LayoutTemplate,
  ArrowLeft,
  ShieldCheck,
  Zap,
  CheckCircle2,
  BookOpen,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { initializeDefaultTemplates } from "./actions";
import { TemplatePropertiesDialog } from "./template-properties-dialog";
import { TemplateStatusToggle } from "./template-status-toggle";
import { TemplatePreviewDialog } from "./template-preview-dialog";
import { cn } from "@/lib/utils";

type TemplateWithDept = Prisma.ReportCardTemplateGetPayload<{
  include: { department: true };
}>;

interface TemplatesPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function TemplatesPage(props: TemplatesPageProps) {
  const { schoolSlug } = await props.params;

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

  if (!school) redirect("/");

  const [templates, departments] = await Promise.all([
    prisma.reportCardTemplate.findMany({
      where: { schoolId: school.id },
      orderBy: { createdAt: "asc" },
      include: {
        department: true,
      },
    }),
    prisma.department.findMany({
      where: { schoolId: school.id },
      orderBy: { name: "asc" },
    }),
  ]);

  const activeCount = templates.filter((t) => t.isActive).length;
  const mappedCount = templates.filter((t) => t.departmentId).length;

  // Coerce Decimal → number safely for client components
  const departmentsForClient = departments.map((d) => ({
    ...d,
    promotionPassMark: d.promotionPassMark != null ? Number(d.promotionPassMark) : null,
  }));

  const GRADIENT_ACCENTS = [
    "from-violet-500/20 to-purple-500/10 border-violet-500/20",
    "from-blue-500/20 to-cyan-500/10 border-blue-500/20",
    "from-emerald-500/20 to-teal-500/10 border-emerald-500/20",
    "from-amber-500/20 to-orange-500/10 border-amber-500/20",
    "from-rose-500/20 to-pink-500/10 border-rose-500/20",
    "from-indigo-500/20 to-blue-500/10 border-indigo-500/20",
  ];

  return (
    <div className="min-h-screen bg-muted/20 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-xl border border-border/50">
            <Link href={`/${schoolSlug}/admin/reports/report-cards`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <LayoutTemplate className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Report Cards</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight">Standardized Templates</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              System-certified layouts for generating student report cards
            </p>
          </div>

          {/* Quick stat chips */}
          {templates.length > 0 && (
            <div className="hidden md:flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-full px-3 py-1.5 text-xs font-bold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {activeCount} Active
              </div>
              <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary rounded-full px-3 py-1.5 text-xs font-bold">
                <Tag className="h-3.5 w-3.5" />
                {mappedCount} Mapped
              </div>
            </div>
          )}
        </div>

        {/* ── Empty State ───────────────────────────────────────────────────── */}
        {templates.length === 0 ? (
          <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-primary/20 bg-primary/3">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
            <div className="relative flex flex-col items-center justify-center p-16 text-center gap-5">
              <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Zap className="h-10 w-10 text-primary animate-pulse" />
              </div>
              <div>
                <h2 className="text-2xl font-black">Initialize School Templates</h2>
                <p className="text-muted-foreground max-w-sm mt-2 text-sm">
                  Your school has no report card templates yet. Install the 3 standardized system defaults to get started.
                </p>
              </div>
              <form
                action={async () => {
                  "use server";
                  await initializeDefaultTemplates(schoolSlug);
                }}
              >
                <Button size="lg" className="px-10 rounded-xl font-bold">
                  <Zap className="h-4 w-4 mr-2" />
                  Initialize Standard Templates
                </Button>
              </form>
            </div>
          </div>
        ) : (
          <div className="space-y-5">

            {/* Info banner */}
            <div className="flex items-start gap-3 bg-blue-500/8 border border-blue-500/20 rounded-xl p-4">
              <ShieldCheck className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-blue-700 dark:text-blue-300">System-Managed Templates</p>
                <p className="text-muted-foreground mt-0.5">
                  Custom template creation is restricted to ensure compliance with standardized reporting formats.
                  Use <strong>Set Properties</strong> to map a template to a specific department.
                </p>
              </div>
            </div>

            {/* Template cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {templates.map((template, idx) => {
                const accent = GRADIENT_ACCENTS[idx % GRADIENT_ACCENTS.length];
                
                const devConfig = template.developmentalConfig as any;
                const selConfig = template.selConfig as any;
                const discConfig = template.disciplineConfig as any;

                let configSummary = "Standard Academic Layout";
                if (devConfig?.categories) {
                  configSummary = `${devConfig.categories.length} developmental categories`;
                } else if (selConfig?.categories) {
                  configSummary = `${selConfig.categories.length} SEL categories + Academics`;
                } else if (discConfig?.metrics) {
                  configSummary = `${discConfig.metrics.length} discipline metrics + Academics`;
                }

                return (
                  <div
                    key={template.id}
                    className={cn(
                      "group relative rounded-2xl border bg-gradient-to-br overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black/5 hover:-translate-y-0.5 flex flex-col justify-between",
                      accent,
                      !template.isActive && "opacity-70"
                    )}
                  >
                    <div>
                      {/* Status bar at top */}
                      <div className={cn(
                        "h-1 w-full",
                        template.isActive ? "bg-gradient-to-r from-emerald-400 to-teal-400" : "bg-muted"
                      )} />

                      <div className="p-5 pb-3">
                        {/* Title row */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-black leading-tight">{template.name}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {template.description || "System-standardized layout"}
                            </p>
                          </div>
                          <TemplateStatusToggle
                            templateId={template.id}
                            schoolSlug={schoolSlug}
                            initialActive={template.isActive}
                          />
                        </div>

                        {/* Meta info */}
                        <div className="space-y-2 mb-4">
                          {/* Department mapping */}
                          <div className="flex items-center gap-2 text-xs">
                            <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            {template.department ? (
                              <span className="font-semibold text-primary">{template.department.name}</span>
                            ) : (
                              <span className="text-muted-foreground italic">No department mapped</span>
                            )}
                          </div>

                          {/* Config details */}
                          <div className="flex items-center gap-2 text-xs">
                            <BookOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground">
                              {configSummary}
                            </span>
                          </div>

                          {/* Last updated */}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-medium">Updated:</span>
                            <span className="font-mono">
                              {new Date(template.updatedAt).toLocaleDateString(undefined, {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="p-5 pt-0">
                      <div className="flex items-center gap-2 pt-3 border-t border-border/30">
                        <TemplatePropertiesDialog
                          template={{
                            ...template,
                            department: template.department
                              ? {
                                  ...template.department,
                                  promotionPassMark:
                                    template.department.promotionPassMark != null
                                      ? Number(template.department.promotionPassMark)
                                      : null,
                                }
                              : null,
                          }}
                          departments={departmentsForClient}
                          schoolSlug={schoolSlug}
                        />
                        <TemplatePreviewDialog template={template} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
