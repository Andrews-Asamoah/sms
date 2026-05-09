// app/(school)/[schoolSlug]/accountant/academicYears/page.tsx
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Prisma } from "@/lib/generated/prisma/client";

interface AcademicYearsPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function AccountantAcademicYearsPage({
  params,
}: AcademicYearsPageProps) {
  const { schoolSlug } = await params;

  const session = await requireSchoolAccess(schoolSlug);
  const role = getSchoolRole(session, schoolSlug);

  if (role?.effectiveRole !== "accountant" && !session.isSuperAdmin) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  type SchoolWithYears = Prisma.SchoolGetPayload<{
    include: {
      academicYears: {
        include: {
          terms: true;
        };
      };
    };
  }>;

  const school = (await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    include: {
      academicYears: {
        include: {
          terms: {
            orderBy: { termNumber: "asc" },
          },
        },
        orderBy: { startDate: "desc" },
      },
    },
  })) as SchoolWithYears | null;

  if (!school) redirect("/");

  const now = new Date();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Academic Years & Terms
        </h1>
        <p className="text-muted-foreground mt-1">
          View academic calendar and term structures.
        </p>
      </div>

      <div className="space-y-6">
        {school.academicYears.map((year) => (
          <Card
            key={year.id}
            className="bg-card/50 backdrop-blur-md border-border/50"
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">{year.name}</CardTitle>
                  <CardDescription>
                    {new Date(year.startDate).toLocaleDateString()} -{" "}
                    {new Date(year.endDate).toLocaleDateString()}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {(() => {
                    const startDate = new Date(year.startDate);
                    const endDate = new Date(year.endDate);
                    if (startDate <= now && endDate >= now)
                      return <Badge variant="default">Active</Badge>;
                    if (startDate > now)
                      return <Badge variant="secondary">Upcoming</Badge>;
                    return <Badge variant="outline">Past</Badge>;
                  })()}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Terms</h3>
                  <div className="grid gap-3 md:grid-cols-3">
                    {year.terms.map((term) => (
                      <div
                        key={term.id}
                        className="p-4 rounded-lg border bg-background/50"
                      >
                        <h4 className="font-semibold">{term.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1 text-nowrap">
                          {new Date(term.startDate).toLocaleDateString()} -{" "}
                          {new Date(term.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
