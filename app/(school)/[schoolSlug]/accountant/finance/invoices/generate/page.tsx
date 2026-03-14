// app/(school)/[schoolSlug]/accountant/finance/invoices/generate/page.tsx
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { GenerateInvoiceClient } from "./generate-client";

interface GenerateInvoicePageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function GenerateInvoicePage({ params }: GenerateInvoicePageProps) {
  const { schoolSlug } = await params;
  
  const session = await requireSchoolAccess(schoolSlug);
  const role = getSchoolRole(session, schoolSlug);

  // Check authorization
  if (
    role?.effectiveRole !== "admin" &&
    role?.effectiveRole !== "owner" &&
    role?.effectiveRole !== "accountant" &&
    !session.isSuperAdmin
  ) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  // Fetch school with fee structures and classes
  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: {
      id: true,
      feeStructures: {
        select: {
          id: true,
          name: true,
          description: true,
        },
        orderBy: { name: "asc" },
      },
      classes: {
        select: {
          id: true,
          name: true,
          level: true,
        },
        orderBy: [
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
    <GenerateInvoiceClient
      schoolSlug={schoolSlug}
      feeStructures={school.feeStructures}
      classes={school.classes}
    />
  );
}
