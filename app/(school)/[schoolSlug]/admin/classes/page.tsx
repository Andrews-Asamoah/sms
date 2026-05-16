// app/(school)/[schoolSlug]/admin/classes/page.tsx - FIXED
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { ClassesClient } from "./client";
import { Button } from "@/components/ui/button";
import { Plus, Upload } from "lucide-react";

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Classes</h1>
          <p className="text-muted-foreground">
            Manage your school classes and assignments
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${schoolSlug}/admin/classes/bulk-upload`}>
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Bulk Upload
            </Button>
          </Link>
          <Link href={`/${schoolSlug}/admin/classes/new`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Class
            </Button>
          </Link>
        </div>
      </div>

      <ClassesClient
        data={
          school.classes.map((cls) => ({
            ...cls,
            classTeacher:
              cls.classTeacher && cls.classTeacher.profile
                ? {
                    id: cls.classTeacher.id,
                    profile: cls.classTeacher.profile,
                  }
                : null,
          })) as any
        }
        schoolSlug={schoolSlug}
      />
    </div>
  );
}
