// components/auth/invite-accept-form.tsx - UPDATED REDIRECT PATHS
"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  Loader2,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { toast } from "sonner";
import { verifyInvitationStatus } from "@/app/auth/invite/[invitationId]/actions";

const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

interface InviteAcceptFormProps {
  invitation: {
    email: string;
    schoolName: string;
    inviterName: string;
    role: string | null;
    invitationId: string;
    name?: string;
  };
}

export function InviteAcceptForm({ invitation }: InviteAcceptFormProps) {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [hasAccount, setHasAccount] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: invitation.name || "",
      email: invitation.email,
      password: "",
      confirmPassword: "",
    },
  });

  async function onSignup(data: SignupFormValues) {
    setIsSubmitting(true);
    setError("");

    try {
      // 1. Verify invitation status before signup
      console.log("🔍 Verifying invitation status...");
      const verification = await verifyInvitationStatus(invitation.invitationId);
      if (!verification.valid) {
        throw new Error(verification.error || "Invitation is no longer valid.");
      }

      console.log("📝 Signing up user:", data.email);

      const signupResult = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: data.name,
      });

      if (signupResult.error) {
        throw new Error(signupResult.error.message);
      }

      console.log("✅ Signup successful");

      // Note: Because autoSignIn is false, the user is not authenticated yet.
      // We cannot call acceptInvitation on the client without a session.
      // However, we want them to sign in natively to accept the invite.
      // So we just switch the view to Login, and once they log in,
      // they can click "Accept Invitation" while authenticated.
      // Wait, the user said: "upon signup, it should accept the invitation then redirect the user to the login page to signin."
      // If we cannot accept the invitation without logging in, we must use a backend workaround OR log them in.
      // Let's revert to a cleaner login -> accept -> logout flow or use a server action.
      // Actually, BetterAuth API allows accepting an invitation via a public endpoint? No.
      // I will keep the previous manual login/logout but explain why it's necessary, 
      // OR wait... Better Auth has `signUp.email` with an `invitationId` inside the API? No.
      // I'll make the backend API route stateless to accept invitations by email if they just signed up? No, that's insecure.
      // I'll revert to the previous code here but make sure the API route works, since I fixed the config in auth.ts.
      // Wait, let's just restore the manual login/logout but in a cleaner way.
      await authClient.signIn.email({
        email: data.email,
        password: data.password,
      });

      console.log("📧 Accepting invitation...");
      const result = await authClient.organization.acceptInvitation({
        invitationId: invitation.invitationId,
      });

      if (result.error) {
        throw new Error(result.error.message || "Failed to accept invitation.");
      }

      await authClient.signOut();

      toast.success("Account created successfully", {
        description: "Your invitation has been accepted. Please sign in to continue.",
        duration: 5000,
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));
      window.location.href = "/auth/login";

    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to create account. Please try again.";
      console.error("❌ Signup error:", errorMessage);
      setError(errorMessage);
      setIsSubmitting(false);
    }
  }

  async function onLogin(data: Pick<SignupFormValues, "email" | "password">) {
    setIsSubmitting(true);
    setError("");

    try {
      // 1. Verify invitation status before login
      console.log("🔍 Verifying invitation status...");
      const verification = await verifyInvitationStatus(invitation.invitationId);
      if (!verification.valid) {
        throw new Error(verification.error || "Invitation is no longer valid.");
      }

      console.log("🔐 Signing in user:", data.email);

      const loginResult = await authClient.signIn.email({
        email: data.email,
        password: data.password,
      });

      if (loginResult.error) {
        throw new Error(loginResult.error.message);
      }

      console.log("✅ Login successful");

      // Wait for Better Auth to process
      await new Promise((resolve) => setTimeout(resolve, 1500));

      console.log("📧 Accepting invitation...");
      const response = await fetch(
        `/api/invitations/${invitation.invitationId}/accept`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to accept invitation");
      }

      const result = await response.json();
      console.log("✅ Invitation accepted, target:", result.redirectUrl);

      // Extra wait for database sync
      await new Promise((resolve) => setTimeout(resolve, 500));

      console.log("🔄 Redirecting via /auth/callback...");

      // Redirect through callback to ensure session is loaded
      window.location.href = `/auth/callback?callbackUrl=${encodeURIComponent(result.redirectUrl)}`;
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to sign in. Please try again.";
      console.error("❌ Login error:", errorMessage);
      setError(errorMessage);
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-white/20 shadow-2xl">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl">
          {hasAccount ? "Sign In to Accept" : "Create Your Account"}
        </CardTitle>
        <CardDescription className="text-sm">
          You&apos;ve been invited by{" "}
          <strong>{invitation.inviterName}</strong> to join{" "}
          <strong>{invitation.schoolName}</strong> as a{" "}
          <strong>{invitation.role}</strong>
        </CardDescription>
      </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4 py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          <form
            onSubmit={form.handleSubmit(hasAccount ? onLogin : onSignup)}
            className="space-y-3"
          >
            <FieldGroup>
              {!hasAccount && (
                <Controller
                  name="name"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="name">Full Name</FieldLabel>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          {...field}
                          id="name"
                          placeholder="Enter your full name"
                          disabled={isSubmitting}
                          aria-invalid={fieldState.invalid}
                          className="pl-10"
                        />
                      </div>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              )}

              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="email">Email Address</FieldLabel>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        {...field}
                        id="email"
                        type="email"
                        disabled
                        aria-invalid={fieldState.invalid}
                        className="pl-10 bg-muted"
                      />
                    </div>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="password">
                      {hasAccount ? "Password" : "Create Password"}
                    </FieldLabel>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        {...field}
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder={
                          hasAccount
                            ? "Enter your password"
                            : "Create a strong password"
                        }
                        disabled={isSubmitting}
                        aria-invalid={fieldState.invalid}
                        className="pl-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        disabled={isSubmitting}
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              {!hasAccount && (
                <Controller
                  name="confirmPassword"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="confirmPassword">
                        Confirm Password
                      </FieldLabel>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          {...field}
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Re-enter your password"
                          disabled={isSubmitting}
                          aria-invalid={fieldState.invalid}
                          className="pl-10 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          disabled={isSubmitting}
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              )}
            </FieldGroup>

            <Button
              type="submit"
              className="w-full mt-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {hasAccount ? "Signing In..." : "Creating Account..."}
                </>
              ) : hasAccount ? (
                "Sign In & Accept Invitation"
              ) : (
                "Create Account & Accept Invitation"
              )}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setHasAccount(!hasAccount);
                  setError("");
                }}
                className="text-sm text-primary hover:underline"
                disabled={isSubmitting}
              >
                {hasAccount
                  ? "Don't have an account? Create one"
                  : "Already have an account? Sign in"}
              </button>
            </div>
          </form>

          {hasAccount && (
            <div className="mt-4 text-center">
              <Link
                href="/auth/forgot-password"
                className="text-sm text-muted-foreground hover:text-primary hover:underline"
              >
                Forgot your password?
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
  );
}
