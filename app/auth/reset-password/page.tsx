// app/auth/reset-password/page.tsx

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getDefaultRoute } from "@/lib/auth/route-resolver";
import { ResetPasswordForm } from "./reset-password-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Set a new password for your school portal account.",
};

export default async function ResetPasswordPage() {
  const session = await getSession();

  if (session) {
    redirect(getDefaultRoute(session));
  }

  return <ResetPasswordForm />;
}
