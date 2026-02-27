import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SetDetailClient } from "./client";

interface SetDetailPageProps {
  params: Promise<{ schoolSlug: string; setId: string }>;
}

export default async function SetDetailPage(props: SetDetailPageProps) {
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
  });

  if (!school) {
    redirect("/");
  }

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
            include: {
              profile: {
                select: { firstName: true, lastName: true },
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

  if (!set) {
    redirect(`/${schoolSlug}/admin/reports/report-cards`);
  }

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/${schoolSlug}/admin/reports/report-cards`}>
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{set.name}</h1>
              <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                <Badge variant="outline">{set.class.name}</Badge>
                <span>•</span>
                <span>
                  {set.academicYear.name} - {set.term.name}
                </span>
              </div>
            </div>
          </div>
        </div>

        <SetDetailClient set={set} schoolSlug={schoolSlug} school={school} />
      </div>
    </div>
  );
}
