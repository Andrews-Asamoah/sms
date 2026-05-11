// app/auth/login/page.tsx
import { Suspense } from "react";
import { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { LogoutSuccessToast } from "@/components/auth/logout-success-toast";
import { AuthCardWrapper } from "@/components/shared/auth-card-wrapper";
import { getSession } from "@/lib/auth/session";
import { getDefaultRoute } from "@/lib/auth/route-resolver";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to your SchoolMS account",
};

export default async function LoginPage() {
  const session = await getSession();
  
  if (session) {
    redirect(getDefaultRoute(session));
  }

  return (
    <>
      <Suspense fallback={null}>
        <LogoutSuccessToast />
      </Suspense>

      <AuthCardWrapper
        title="Welcome back"
        description="Sign in to your account to continue"
      >
        <LoginForm />
      </AuthCardWrapper>
    </>
  );
}
