// app/(auth)/login/page.tsx
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { LogoutSuccessToast } from "@/components/auth/logout-success-toast";
import { AuthCardWrapper } from "@/components/shared/auth-card-wrapper";

export default function LoginPage() {
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
