import { Suspense } from "react";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { PromotionClient } from "./promotion-client";
import { GraduationCap, Loader2 } from "lucide-react";

interface AdminPromotionPageProps {
  params: Promise<{ schoolSlug: string }>;
}

/** Skeleton shown while the heavy data-fetch resolves */
function PromotionSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 bg-muted/40 rounded-lg w-2/3" />
      <div className="rounded-2xl border p-6 space-y-4">
        <div className="h-6 bg-muted/30 rounded w-1/4" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-10 bg-muted/20 rounded" />
          <div className="h-10 bg-muted/20 rounded" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted/15 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Async server component that performs the heavy data fetching */
async function PromotionContent({ schoolSlug }: { schoolSlug: string }) {
  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
  });

  if (!school) redirect("/");

  interface SchoolSettings {
    nextAcademicYearId?: string;
    currentAcademicYearId?: string;
    [key: string]: any;
  }
  const settings = (school.settings as unknown as SchoolSettings) || {};
  const nextAcademicYearId = settings.nextAcademicYearId;
  const currentAcademicYearId = settings.currentAcademicYearId;

  const nextAcademicYear = nextAcademicYearId
    ? await prisma.academicYear.findUnique({
        where: { id: nextAcademicYearId },
        include: {
          terms: {
            orderBy: { termNumber: "asc" },
            take: 1,
            select: { id: true },
          },
        },
      })
    : null;

  // Fetch classes for the current academic year (source classes)
  const currentClasses = await prisma.class.findMany({
    where: {
      schoolId: school.id,
      isActive: true,
      academicYearId: currentAcademicYearId,
    },
    select: {
      id: true,
      name: true,
      isGraduatingClass: true,
      nextPromotionClassId: true,
      department: {
        select: {
          id: true,
          name: true,
          promotionPassMark: true,
        },
      },
    },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });

  // Fetch classes for the target academic year (destination classes)
  const targetClasses = nextAcademicYearId
    ? await prisma.class.findMany({
        where: {
          schoolId: school.id,
          isActive: true,
          academicYearId: nextAcademicYearId,
        },
        select: {
          id: true,
          name: true,
          order: true,
        },
        orderBy: [{ order: "asc" }, { name: "asc" }],
      })
    : [];

  const classes = currentClasses.map((c) => ({
    ...c,
    department: c.department
      ? {
          ...c.department,
          promotionPassMark: c.department.promotionPassMark
            ? Number(c.department.promotionPassMark)
            : null,
        }
      : null,
  }));

  // Get the first term of the target academic year for enrolment creation
  const targetFirstTermId = nextAcademicYear?.terms?.[0]?.id || null;

  if (!nextAcademicYear) {
    return (
      <div className="rounded-2xl border border-destructive bg-destructive/5 p-6 text-center space-y-2">
        <h2 className="text-lg font-bold text-destructive">
          No Next Academic Year Configured
        </h2>
        <p className="text-muted-foreground text-sm">
          Please configure a &quot;Next Academic Year&quot; in the system
          settings before running promotions. Promoted students need to be
          enrolled into an upcoming term.
        </p>
      </div>
    );
  }

  return (
    <PromotionClient
      schoolSlug={schoolSlug}
      classes={classes}
      targetClasses={targetClasses}
      targetAcademicYearId={nextAcademicYear.id}
      targetAcademicYearName={nextAcademicYear.name}
      currentAcademicYearId={currentAcademicYearId || ""}
      targetFirstTermId={targetFirstTermId}
    />
  );
}

export default async function AdminPromotionPage({
  params,
}: AdminPromotionPageProps) {
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                End-of-Year Promotions
              </h1>
              <p className="text-muted-foreground mt-1">
                Evaluate student scores and manage promotions, repetitions,
                graduations, and special promotions.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Suspense fallback={<PromotionSkeleton />}>
        <PromotionContent schoolSlug={schoolSlug} />
      </Suspense>
    </div>
  );
}
