import { getSession } from "@/lib/auth/session";
import { getNavPermissions } from "@/lib/permissions/utils";
import { redirect } from "next/navigation";
import ExpensesClient from "./expenses-client";

interface PageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function ExpensesPage({ params }: PageProps) {
  const { schoolSlug } = await params;
  const session = await getSession();

  if (!session) {
    redirect("/auth/login");
  }

  const permissions = await getNavPermissions(session, schoolSlug);

  if (!permissions.canViewFinance) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  return <ExpensesClient permissions={permissions} />;
}
