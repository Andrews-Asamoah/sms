// app/(school)/[schoolSlug]/admin/classes/page.tsx - FIXED
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Users, GraduationCap, BookOpen } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteClassButton } from "@/components/school/classes/delete-class-button";

interface ClassesPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function ClassesPage({ params }: ClassesPageProps) {
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

  // Fetch school with classes
  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    include: {
      classes: {
        include: {
          classTeacher: {
            include: {
              profile: true,
            },
          },
          academicYear: true,
          _count: {
            select: {
              students: true,
              subjects: true,
            },
          },
        },
        orderBy: [
          { academicYear: { startDate: "desc" } },
          { level: "asc" },
          { name: "asc" },
        ],
      },
    },
  });

  if (!school) {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Classes Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your school classes and assignments
          </p>
        </div>
        <Link href={`/${schoolSlug}/admin/classes/new`}>
          <Button size="lg">
            <Plus className="mr-2 h-5 w-5" />
            New Class
          </Button>
        </Link>
      </div>

      {/* Stats Cards with Glassmorphism */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="backdrop-blur-sm bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{school.classes.length}</div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-sm bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Classes
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {school.classes.filter((c) => c.isActive).length}
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-sm bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Students
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {school.classes.reduce((sum, c) => sum + c._count.students, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Classes Grid */}
      {school.classes.length === 0 ? (
        <Card className="backdrop-blur-sm bg-card/50 border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted p-4 mb-4">
              <GraduationCap className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No classes yet</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-sm">
              Get started by creating your first class
            </p>
            <Link href={`/${schoolSlug}/admin/classes/new`}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Class
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {school.classes.map((classItem) => (
            <Card
              key={classItem.id}
              className="backdrop-blur-sm bg-card/50 border-border/50 hover:bg-card/80 transition-all duration-200"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl">{classItem.name}</CardTitle>
                    <CardDescription className="mt-1">
                      Level: {classItem.level}
                      {classItem.section && ` - ${classItem.section}`}
                    </CardDescription>
                  </div>
                  <Badge variant={classItem.isActive ? "default" : "secondary"}>
                    {classItem.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Academic Year</span>
                    <span className="font-medium">
                      {classItem.academicYear.name}
                    </span>
                  </div>

                  {classItem.classTeacher && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Class Teacher
                      </span>
                      <span className="font-medium">
                        {classItem.classTeacher.profile.firstName}{" "}
                        {classItem.classTeacher.profile.lastName}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Students</span>
                    <span className="font-medium">
                      {classItem._count.students}
                      {classItem.capacity && ` / ${classItem.capacity}`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subjects</span>
                    <span className="font-medium">
                      {classItem._count.subjects}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Link
                    href={`/${schoolSlug}/admin/classes/${classItem.id}`}
                    className="flex-1"
                  >
                    <Button variant="outline" size="sm" className="w-full">
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                  </Link>
                  <DeleteClassButton
                    classId={classItem.id}
                    className={classItem.name}
                    schoolSlug={schoolSlug}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
