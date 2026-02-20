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
      name: "",
      email: invitation.email,
      password: "",
      confirmPassword: "",
    },
  });

  async function onSignup(data: SignupFormValues) {
    setIsSubmitting(true);
    setError("");

    try {
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
    <div className="container flex items-center justify-center min-h-screen py-8">
      <Card className="w-full max-w-md backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-white/20 shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {hasAccount ? "Sign In to Accept" : "Create Your Account"}
          </CardTitle>
          <CardDescription>
            You&apos;ve been invited by{" "}
            <strong>{invitation.inviterName}</strong> to join{" "}
            <strong>{invitation.schoolName}</strong> as a{" "}
            <strong>{invitation.role}</strong>
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form
            onSubmit={form.handleSubmit(hasAccount ? onLogin : onSignup)}
            className="space-y-4"
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
              className="w-full"
              size="lg"
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
    </div>
  );
}
