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

interface CredentialsPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function CredentialsPage({ params }: CredentialsPageProps) {
  const { schoolSlug } = await params;
  const session = await requireSchoolAccess(schoolSlug);
  const role = getSchoolRole(session, schoolSlug);

  // Check authorization
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

  const students = await prisma.student.findMany({
    where: { schoolId: school.id, status: "ACTIVE" },
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
              email: true,
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

      <Card className="backdrop-blur-sm bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Plain Text Passwords
          </CardTitle>
          <CardDescription>
            This list is strictly for administrators to help junior students log
            in. Remember to clear the session or lock your screen when finished.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CredentialsTable data={students as any} schoolSlug={schoolSlug} />
        </CardContent>
      </Card>
    </div>
  );
}
