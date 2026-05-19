import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { Suspense } from "react";
import {
  Users,
  UserCheck,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { StudentsClient, type StudentData } from "./students-client";

// Cache per school for 5 minutes. Tagged so mutations can revalidate it.
const getStudents = (schoolId: string) =>
  unstable_cache(
    () =>
      prisma.student.findMany({
        where: { schoolId },
        include: { profile: true, class: true },
        orderBy: { profile: { firstName: "asc" } },
      }),
    [`accountant-students-${schoolId}`],
    { revalidate: 300, tags: [`students-${schoolId}`] }
  )();

export default function AccountantStudentsPage({ 
  params 
}: { 
  params: Promise<{ schoolSlug: string }> 
}) {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Students</h1>
          <p className="text-muted-foreground mt-1">
            View student directory and financial status.
          </p>
        </div>
      </div>

      <Suspense fallback={<StudentsDashboardSkeleton />}>
        <StudentsContent params={params} />
      </Suspense>
    </div>
  );
}

async function StudentsContent({ params }: { params: Promise<{ schoolSlug: string }> }) {
  const { schoolSlug } = await params;
  const session = await requireSchoolAccess(schoolSlug);
  const role = getSchoolRole(session, schoolSlug);

  if (role?.effectiveRole !== "accountant" && !session.isSuperAdmin) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
  });

  if (!school) redirect("/");

  const rawStudents = await getStudents(school.id);

  const students: StudentData[] = rawStudents.map((s) => ({
    id: s.id,
    studentId: s.studentId,
    firstName: s.profile?.firstName || "N/A",
    lastName: s.profile?.lastName || "N/A",
    className: s.class?.name || "N/A",
    outstandingBalance: Number(s.outstandingBalance),
    status: s.status,
  }));

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card/50 backdrop-blur-md border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{students.length}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 backdrop-blur-md border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {students.filter(s => s.status === "ACTIVE").length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-md border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Outstanding</CardTitle>
            <span className="text-xs font-bold text-destructive">Debt</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(students.reduce((sum, s) => sum + s.outstandingBalance, 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 backdrop-blur-md border-border/50">
        <CardContent className="pt-6">
          <StudentsClient data={students} />
        </CardContent>
      </Card>
    </>
  );
}

function StudentsDashboardSkeleton() {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card/50 backdrop-blur-md border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
          </CardContent>
        </Card>
        
        <Card className="bg-card/50 backdrop-blur-md border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-md border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Outstanding</CardTitle>
            <span className="text-xs font-bold text-destructive">Debt</span>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-32" />
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 backdrop-blur-md border-border/50">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
               <Skeleton className="h-10 w-52" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-10 w-[300px]" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-[100px]" />
                <Skeleton className="h-10 w-[100px]" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
