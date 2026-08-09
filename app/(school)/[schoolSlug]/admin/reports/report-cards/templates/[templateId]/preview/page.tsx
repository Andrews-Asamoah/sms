import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  LayoutTemplate,
  Tag,
  CheckCircle2,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TemplatePreviewRenderer } from "../../template-preview-renderer";

interface PreviewPageProps {
  params: Promise<{ schoolSlug: string; templateId: string }>;
}

export async function generateMetadata({ params }: PreviewPageProps) {
  const { templateId } = await params;
  return { title: `Template Preview` };
}

export default async function TemplatePreviewPage({ params }: PreviewPageProps) {
  const { schoolSlug, templateId } = await params;

  const session = await requireSchoolAccess(schoolSlug);
  const role = getSchoolRole(session, schoolSlug);

  if (
    role?.effectiveRole !== "admin" &&
    role?.effectiveRole !== "owner" &&
    role?.effectiveRole !== "headteacher" &&
    !session.isSuperAdmin
  ) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true, name: true },
  });

  if (!school) redirect("/");

  const template = await prisma.reportCardTemplate.findFirst({
    where: { id: templateId, schoolId: school.id },
    include: { department: true },
  });

  if (!template) notFound();

  const layoutType = (template.layout as any)?.type ?? "classic";

  const LAYOUT_BADGE: Record<string, { label: string; color: string }> = {
    modern_executive: { label: "Modern Executive", color: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20 dark:text-indigo-300" },
    modern_terminal:  { label: "Modern Terminal",  color: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20 dark:text-indigo-300" },
    wesley:           { label: "Modern Executive", color: "bg-indigo-500/10 text-indigo-700 border-indigo-500/20 dark:text-indigo-300" },
    classic:          { label: "Classic Formal",   color: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300" },
    formal:           { label: "Classic Formal",   color: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-300" },
    jhs:              { label: "JHS Detailed",     color: "bg-violet-500/10 text-violet-700 border-violet-500/20 dark:text-violet-300" },
    primary:          { label: "Primary Standard", color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300" },
    kindergarten:     { label: "Kindergarten",     color: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300" },
    creche:           { label: "Creche & Nursery", color: "bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-300" },
  };

  const badge = LAYOUT_BADGE[layoutType] ?? {
    label: layoutType,
    color: "bg-muted text-muted-foreground border-border",
  };

  return (
    /* Full-bleed container that escapes the admin content padding */
    <div className="-m-4 md:-m-6 min-h-screen flex flex-col bg-muted/30">

      {/* ── Sticky Top Bar ── */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/60 shadow-sm print:hidden">
        <div className="px-4 md:px-8 h-14 flex items-center gap-3">

          {/* Back */}
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="rounded-xl border border-border/50 h-8 w-8 shrink-0"
          >
            <Link href={`/${schoolSlug}/admin/reports/report-cards/templates`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>

          {/* Title */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <LayoutTemplate className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0 leading-none">
              <p className="text-[9px] font-bold text-primary uppercase tracking-widest">
                Template Preview
              </p>
              <h1 className="text-sm font-black truncate mt-0.5">
                {template.name}
              </h1>
            </div>
          </div>

          {/* Badges */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <span
              className={cn(
                "text-[11px] font-bold px-3 py-1 rounded-full border",
                badge.color
              )}
            >
              {badge.label}
            </span>

            {template.department && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">
                <Tag className="h-3 w-3" />
                {template.department.name}
              </span>
            )}

            {template.isActive && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                <CheckCircle2 className="h-3 w-3" />
                Active
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Info Banner ── */}
      <div className="flex items-center gap-2 px-4 md:px-8 py-2.5 bg-amber-500/8 border-b border-amber-500/15 print:hidden">
        <Info className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="text-xs text-amber-700 dark:text-amber-300">
          This is a preview with <strong>sample student data</strong>.
          {template.description && (
            <span className="text-muted-foreground ml-2">— {template.description}</span>
          )}
        </p>
      </div>

      {/* ── Report Card (full width, centred) ── */}
      <div className="flex-1 py-8 px-2 md:px-8">
        <TemplatePreviewRenderer
          template={{
            id:                  template.id,
            name:                template.name,
            description:         template.description,
            layout:              template.layout as any,
            developmentalConfig: template.developmentalConfig as any,
            selConfig:           template.selConfig as any,
            disciplineConfig:    template.disciplineConfig as any,
          }}
        />
      </div>
    </div>
  );
}
