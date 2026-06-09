import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CredentialsTable } from "@/components/school/students/credentials-table";
import { StudentClassFilter } from "@/components/school/students/student-class-filter";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface CredentialsPageProps {
  params: Promise<{ schoolSlug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CredentialsPage({ params, searchParams }: CredentialsPageProps) {
  const { schoolSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const classId = resolvedSearchParams.classId as string | undefined;

  const session = await requireSchoolAccess(schoolSlug);
  const role = getSchoolRole(session, schoolSlug);

  // Check authorization
  if (
    role?.effectiveRole !== "admin" && role?.effectiveRole !== "owner" && role?.effectiveRole !== "headteacher" &&
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

  // Fetch all classes for the filter dropdown
  const classes = await prisma.class.findMany({
    where: { schoolId: school.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  if (!classId && classes.length > 0) {
    redirect(`/${schoolSlug}/admin/students/credentials?classId=${classes[0].id}`);
  }

  const effectiveClassId = classId || "all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/${schoolSlug}/admin/students`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Student Credentials
            </h1>
            <p className="text-muted-foreground mt-1">
              View generated passwords for active students
            </p>
          </div>
        </div>
      </div>

      <Suspense fallback={<CredentialsTableSkeleton />}>
        <CredentialsListContent
          schoolId={school.id}
          schoolSlug={schoolSlug}
          classId={effectiveClassId}
          classes={classes}
        />
      </Suspense>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Async Server Component for fetching students
// ----------------------------------------------------------------------------
async function CredentialsListContent({
  schoolId,
  schoolSlug,
  classId,
  classes,
}: {
  schoolId: string;
  schoolSlug: string;
  classId: string;
  classes: { id: string; name: string }[];
}) {
  const whereClause: any = { schoolId, status: "ACTIVE" };
  if (classId !== "all") {
    whereClause.classId = classId;
  }

  const students = await prisma.student.findMany({
    where: whereClause,
    select: {
      id: true,
      studentId: true,
      plainTextPassword: true,
      profile: {
        select: {
          firstName: true,
          lastName: true,
          otherNames: true,
          user: {
            select: {
              id: true,
              email: true,
              banned: true,
              banReason: true,
            },
          },
        },
      },
      class: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [
      {
        class: { name: "asc" },
      },
      {
        profile: { firstName: "asc" },
      },
    ],
  });

  return (
    <Card className="backdrop-blur-sm bg-card/50 border-border/50">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Plain Text Passwords
          </CardTitle>
          <CardDescription>
            This list is strictly for administrators to help junior students log
            in. Remember to clear the session or lock your screen when finished.
          </CardDescription>
        </div>
        <div>
          <StudentClassFilter
            classes={classes}
            currentClassId={classId}
          />
        </div>
      </CardHeader>
      <CardContent>
        <CredentialsTable data={students as any} schoolSlug={schoolSlug} />
      </CardContent>
    </Card>
  );
}

function CredentialsTableSkeleton() {
  return (
    <Card className="backdrop-blur-sm bg-card/50 border-border/50">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-4 w-[350px]" />
        </div>
        <Skeleton className="h-11 w-[200px]" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
