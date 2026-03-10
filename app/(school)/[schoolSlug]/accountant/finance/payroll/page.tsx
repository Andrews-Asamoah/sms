import { Metadata } from "next";
import { PayrollClient } from "./payroll-client";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getNavPermissions } from "@/lib/permissions/utils";

export const metadata: Metadata = {
  title: "Payroll Management | School Management System",
  description: "Manage staff salaries and generate payslips",
};

interface PayrollPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function PayrollPage({ params }: PayrollPageProps) {
  const { schoolSlug } = await params;

  // Ensure user has access to this school
  const session = await requireSchoolAccess(schoolSlug);

  // Get permissions for the current user
  const permissions = await getNavPermissions(session, schoolSlug);

  return (
    <div className="p-6">
      <PayrollClient />
    </div>
  );
}
