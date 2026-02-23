import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { DepartmentsClient } from "./client";
import { DepartmentDialog } from "@/components/school/departments/department-dialog";
import { Building2 } from "lucide-react";

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Academics | Departments",
  description: "Manage all schools in the system",
};

interface DepartmentsPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function DepartmentsPage(props: DepartmentsPageProps) {
  const params = await props.params;
  const { schoolSlug } = params;

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

  // Fetch departments with HOD details
  // Note: HOD is fetched via headOfDept relation
  const departments = await prisma.department.findMany({
    where: { schoolId: school.id },
    include: {
      headOfDept: {
        select: {
          id: true,
          profile: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      _count: {
        select: {
          subjects: true,
          teachersInDepartment: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // Safe mapping for DataTable
  const formattedDepartments = departments.map((dept) => {
    const profile = dept.headOfDept?.profile;
    return {
      ...dept,
      headOfDept:
        dept.headOfDept && profile
          ? {
              id: dept.headOfDept.id,
              firstName: profile.firstName,
              lastName: profile.lastName,
              profile: profile,
            }
          : null,
    };
  });

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Building2 className="h-8 w-8 text-primary" />
              Departments
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage academic departments and their heads
            </p>
          </div>
          <DepartmentDialog schoolSlug={schoolSlug} />
        </div>

        <div className="bg-background rounded-lg border shadow-sm p-4">
          <DepartmentsClient
            data={formattedDepartments}
            schoolSlug={schoolSlug}
          />
        </div>
      </div>
    </div>
  );
}
