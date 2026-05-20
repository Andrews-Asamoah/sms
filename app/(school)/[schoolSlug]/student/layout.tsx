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

  const { school, academicYear, currentTerm, academicYears, allRoles, permissions, userData, subscriptionStatus } =
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
      academicYears={academicYears}
      currentRole={userData.role}
      availableRoles={allRoles}
      permissions={permissions}
      subscriptionStatus={subscriptionStatus}
    >
      {children}
    </RoleLayoutWrapper>
  );
}
