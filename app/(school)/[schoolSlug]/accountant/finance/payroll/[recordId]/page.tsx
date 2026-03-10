import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { PayslipClient } from "./payslip-client";

interface PayrollDetailsPageProps {
  params: Promise<{ schoolSlug: string; recordId: string }>;
}

export default async function PayrollDetailsPage({
  params,
}: PayrollDetailsPageProps) {
  const { schoolSlug, recordId } = await params;

  const session = await requireSchoolAccess(schoolSlug);
  const role = getSchoolRole(session, schoolSlug);

  if (!role || (role.effectiveRole !== "admin" && role.effectiveRole !== "owner" && role.effectiveRole !== "accountant" && !session.isSuperAdmin)) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
  });

  if (!school) {
    redirect("/");
  }

  const record = await prisma.payrollRecord.findUnique({
    where: {
      id: recordId,
      schoolId: school.id,
    },
    include: {
      _count: {
        select: { payslips: true },
      },
    },
  });

  if (!record) {
    notFound();
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <PayslipClient
        recordId={record.id}
        month={record.month}
        year={record.year}
        status={record.status}
        totalGross={record.totalGross.toString()}
        totalNet={record.totalNet.toString()}
      />
    </div>
  );
}
