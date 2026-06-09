import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ChevronLeft, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BroadSheetClient } from "./client";

interface BroadSheetPageProps {
  params: Promise<{ schoolSlug: string; setId: string }>;
  searchParams?: Promise<{ classId?: string }>;
}

export default async function BroadSheetPage(props: BroadSheetPageProps) {
  const params = await props.params;
  const searchParams = props.searchParams ? await props.searchParams : {};
  const { schoolSlug, setId } = params;
  const targetClassId = searchParams.classId;

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
    select: { id: true },
  });

  if (!school) {
    redirect("/");
  }

  const set = await prisma.reportCardSet.findUnique({
    where: { id: setId },
    include: {
      class: true,
      targetClasses: {
        include: { class: true }
      },
      reportCards: {
        include: {
          student: {
            include: {
              profile: true,
            },
          },
        },
      },
    },
  });

  if (!set) {
    redirect(`/${schoolSlug}/admin/reports/report-cards`);
  }

  if (targetClassId) {
    const selectedTarget = set.targetClasses.find(tc => tc.class.id === targetClassId);
    if (selectedTarget) {
      set.targetClasses = [selectedTarget]; // Filter to only the requested class
    } else if (set.class && set.class.id !== targetClassId) {
      // Legacy set fallback - if it's single class and doesn't match, we still just show what we have, but theoretically it could be empty
    }
  } else if (set.targetClasses.length > 0) {
    // Default to the first class if none specified and has multiple
    set.targetClasses = [set.targetClasses[0]];
  }

  const classNameDisplay = set.class 
    ? set.class.name 
    : set.targetClasses.map(tc => tc.class.name).join(", ");

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link
                href={`/${schoolSlug}/admin/reports/report-cards/sets/${setId}`}
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Class Broad Sheet
              </h1>
              <p className="text-muted-foreground mt-1">
                {set.name} • {classNameDisplay || "Multiple Classes"}
              </p>
            </div>
          </div>
        </div>

        <BroadSheetClient set={set} schoolSlug={schoolSlug} />
      </div>
    </div>
  );
}
