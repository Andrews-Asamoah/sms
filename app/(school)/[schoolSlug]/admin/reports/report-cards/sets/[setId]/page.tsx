import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SetDetailClient } from "./client";

interface SetDetailPageProps {
  params: Promise<{ schoolSlug: string; setId: string }>;
  searchParams: Promise<{ classId?: string }>;
}

export default async function SetDetailPage(props: SetDetailPageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const { schoolSlug, setId } = params;
  const initialClassId = searchParams.classId;

  const session = await requireSchoolAccess(schoolSlug);
  const role = getSchoolRole(session, schoolSlug);

  if (
    role?.effectiveRole !== "admin" && role?.effectiveRole !== "owner" && role?.effectiveRole !== "headteacher" &&
    !session.isSuperAdmin
  ) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
  });

  if (!school) redirect("/");

  const set = await prisma.reportCardSet.findUnique({
    where: { id: setId },
    include: {
      academicYear: { select: { name: true } },
      term: { select: { name: true } },
      class: {
        select: {
          id: true,
          name: true,
          students: {
            where: { status: "ACTIVE" },
            orderBy: { profile: { lastName: "asc" } },
            select: {
              id: true,
              profile: { select: { firstName: true, lastName: true, otherNames: true } },
            },
          },
        }
      },
      targetClasses: {
        include: {
          class: {
            select: {
              id: true,
              name: true,
              students: {
                where: { status: "ACTIVE" },
                orderBy: { profile: { lastName: "asc" } },
                select: {
                  id: true,
                  profile: { select: { firstName: true, lastName: true, otherNames: true } },
                },
              },
            },
          },
        },
      },
      reportCards: {
        select: {
          id: true,
          studentId: true,
          publishedAt: true,
          createdAt: true,
          data: true,
        },
      },
    },
  });

  if (!set) notFound();

  // Build the list of classes — prefer targetClasses (multi-class), fallback to single class
  const displayClasses =
    set.targetClasses.length > 0
      ? set.targetClasses.map((tc) => tc.class)
      : set.class
      ? [set.class]
      : [];

  const totalStudents = displayClasses.reduce(
    (sum, cls) => sum + (cls.students?.length ?? 0),
    0,
  );

  // Fetch the school's grading system
  let gradingSystem = await prisma.gradingSystem.findFirst({
    where: { schoolId: school.id, isSchoolDefault: true },
    include: { gradeScales: { orderBy: { minScore: "desc" } } },
  });
  if (!gradingSystem) {
    gradingSystem = await prisma.gradingSystem.findFirst({
      where: { schoolId: school.id, isActive: true },
      include: { gradeScales: { orderBy: { minScore: "desc" } } },
    });
  }
  if (!gradingSystem) {
    gradingSystem = await prisma.gradingSystem.findFirst({
      where: { isSystemDefault: true },
      include: { gradeScales: { orderBy: { minScore: "desc" } } },
    });
  }

  const serializedGradingSystem = JSON.parse(JSON.stringify(gradingSystem));

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
          {/* Back button */}
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="self-start shrink-0 h-9 w-9 rounded-lg border border-border/50 hover:border-border"
          >
            <Link href={`/${schoolSlug}/admin/reports/report-cards`}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>

          {/* Title block */}
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight line-clamp-2">
              {set.name}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {displayClasses.slice(0, 3).map((cls) => (
                <Badge key={cls.id} variant="outline" className="text-xs">
                  {cls.name}
                </Badge>
              ))}
              {displayClasses.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{displayClasses.length - 3} more
                </Badge>
              )}
              <span className="text-muted-foreground text-xs hidden sm:inline">•</span>
              <span className="text-muted-foreground text-xs">
                {set.academicYear.name} — {set.term.name}
              </span>
            </div>
          </div>
        </div>

        {/* ── Client ─────────────────────────────────────────────────── */}
        <SetDetailClient
          set={{ ...set, displayClasses, totalStudents }}
          schoolSlug={schoolSlug}
          school={school}
          initialClassId={initialClassId}
          gradingSystem={serializedGradingSystem}
        />
      </div>
    </div>
  );
}
