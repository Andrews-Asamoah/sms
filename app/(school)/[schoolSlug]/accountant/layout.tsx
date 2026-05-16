// app/(school)/[schoolSlug]/accountant/layout.tsx
import { getRoleLayoutData } from "@/lib/layout/get-role-layout-data";
import { RoleLayoutWrapper } from "@/components/layout/role-layout-wrapper";
import { ReactNode } from "react";

interface AccountantLayoutProps {
  children: ReactNode;
  params: Promise<{ schoolSlug: string }>;
}

export default async function AccountantLayout({
  children,
  params,
}: AccountantLayoutProps) {
  const { schoolSlug } = await params;

  const { school, academicYear, currentTerm, academicYears, allRoles, permissions, userData } =
    await getRoleLayoutData(schoolSlug, ["accountant", "owner", "admin"]);

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
