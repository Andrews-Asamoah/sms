// app/auth/forgot-password/page.tsx
// Server Component — handles session redirect, then renders the client form.

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getDefaultRoute } from "@/lib/auth/route-resolver";
import { ForgotPasswordForm } from "./forgot-password-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your school portal password.",
};

export default async function ForgotPasswordPage() {
  const session = await getSession();

  if (session) {
    redirect(getDefaultRoute(session));
  }

  return <ForgotPasswordForm />;
}
