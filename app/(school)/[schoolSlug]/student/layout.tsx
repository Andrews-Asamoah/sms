// app/(school)/[schoolSlug]/student/layout.tsx
import { getRoleLayoutData } from "@/lib/layout/get-role-layout-data";
import { RoleLayoutWrapper } from "@/components/layout/role-layout-wrapper";
import { ReactNode } from "react";

interface StudentLayoutProps {
  children: ReactNode;
  params: Promise<{ schoolSlug: string }>;
}

export default async function StudentLayout({
  children,
  params,
}: StudentLayoutProps) {
  const { schoolSlug } = await params;

  const { school, academicYear, currentTerm, allRoles, permissions, userData } =
    await getRoleLayoutData(schoolSlug, ["student", "owner", "admin"]);

  return (
    <RoleLayoutWrapper
      schoolSlug={schoolSlug}
      schoolName={school.name}
      schoolPlan={school.subscription?.planName || "Free Plan"}
      schoolLogo={school.logo || undefined}
      user={userData}
      academicYear={academicYear}
      currentTerm={currentTerm}
      currentRole={userData.role}
      availableRoles={allRoles}
      permissions={permissions}
    >
      {children}
    </RoleLayoutWrapper>
  );
}
