import { getSession } from "@/lib/auth/session";
import { getNavPermissions } from "@/lib/permissions/utils";
import { redirect } from "next/navigation";
import PaymentsClient from "./client";

interface PageProps {
  params: {
    schoolSlug: string;
  };
}

export default async function PaymentsPage({ params }: PageProps) {
  const { schoolSlug } = params;
  const session = await getSession();

  if (!session) {
    redirect("/auth/login");
  }

  const permissions = await getNavPermissions(session, schoolSlug);

  if (!permissions.canViewFinance) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  return <PaymentsClient permissions={permissions} />;
}
