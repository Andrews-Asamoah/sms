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
}

export default async function BroadSheetPage(props: BroadSheetPageProps) {
  const params = await props.params;
  const { schoolSlug, setId } = params;

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

  const set = await prisma.reportCardSet.findUnique({
    where: { id: setId },
    include: {
      class: true,
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
                {set.name} • {set.class.name}
              </p>
            </div>
          </div>
        </div>

        <BroadSheetClient set={set} schoolSlug={schoolSlug} />
      </div>
    </div>
  );
}
