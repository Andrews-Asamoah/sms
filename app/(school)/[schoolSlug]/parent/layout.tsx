// app/(school)/[schoolSlug]/parent/layout.tsx
import { getRoleLayoutData } from "@/lib/layout/get-role-layout-data";
import { RoleLayoutWrapper } from "@/components/layout/role-layout-wrapper";
import { ReactNode } from "react";

interface ParentLayoutProps {
  children: ReactNode;
  params: Promise<{ schoolSlug: string }>;
}

export default async function ParentLayout({
  children,
  params,
}: ParentLayoutProps) {
  const { schoolSlug } = await params;

  const { school, academicYear, currentTerm, allRoles, permissions, userData } =
    await getRoleLayoutData(schoolSlug, ["guardian", "owner", "admin"]);

  return (
    <RoleLayoutWrapper
      schoolSlug={schoolSlug}
      schoolName={school.name}
      schoolPlan={school.subscription?.planName || "Free Plan"}
      schoolLogo={school.logo || undefined}
      user={{
        ...userData,
        role: "guardian",
      }}
      academicYear={academicYear}
      currentTerm={currentTerm}
      currentRole="guardian"
      availableRoles={allRoles}
      permissions={permissions}
    >
      {children}
    </RoleLayoutWrapper>
  );
}
