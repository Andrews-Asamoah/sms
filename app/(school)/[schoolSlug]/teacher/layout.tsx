// app/(school)/[schoolSlug]/(teacher)/teacher/layout.tsx
import { getRoleLayoutData } from "@/lib/layout/get-role-layout-data";
import { RoleLayoutWrapper } from "@/components/layout/role-layout-wrapper";
import { ReactNode } from "react";

interface TeacherLayoutProps {
  children: ReactNode;
  params: Promise<{ schoolSlug: string }>;
}

export default async function TeacherLayout({
  children,
  params,
}: TeacherLayoutProps) {
  const { schoolSlug } = await params;

  const { school, academicYear, currentTerm, academicYears, allRoles, permissions, userData } =
    await getRoleLayoutData(schoolSlug, ["teacher", "owner", "admin"]);

  return (
    <RoleLayoutWrapper
      schoolSlug={schoolSlug}
      schoolName={school.name}
      schoolPlan={school.subscription?.planName || "Free Plan"}
      schoolLogo={school.logo || undefined}
      user={userData}
      academicYear={academicYear}
      currentTerm={currentTerm}
      academicYears={academicYears}
      currentRole={userData.role}
      availableRoles={allRoles}
      permissions={permissions}
    >
      {children}
    </RoleLayoutWrapper>
  );
}
