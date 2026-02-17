// app/(school)/[schoolSlug]/admin/layout.tsx - SIMPLIFIED
import { getRoleLayoutData } from "@/lib/layout/get-role-layout-data";
import { RoleLayoutWrapper } from "@/components/layout/role-layout-wrapper";
import { ReactNode } from "react";

export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;

  const { school, academicYear, currentTerm, allRoles, permissions, userData } =
    await getRoleLayoutData(schoolSlug, ["owner", "admin"]);

  return (
    <RoleLayoutWrapper
      schoolSlug={schoolSlug}
      schoolName={school.name}
      schoolPlan={school.subscription?.planName || "Free Plan"}
      schoolLogo={school.logo || undefined}
      user={userData}
      academicYear={academicYear}
      currentTerm={currentTerm}
      currentRole="admin"
      availableRoles={allRoles}
      permissions={permissions}
    >
      {children}
    </RoleLayoutWrapper>
  );
}
