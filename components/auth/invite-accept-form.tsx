// components/auth/invite-accept-form.tsx
"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Phone,
  Eye,
  EyeOff,
  Building2,
  CheckCircle2,
  Shield,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import Link from "next/link";
import { toast } from "sonner";
import { verifyInvitationStatus } from "@/app/auth/invite/[invitationId]/actions";

const signupSchema = z
  .object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    phone: z.string().optional(),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Min 8 chars")
      .regex(/[A-Z]/, "No uppercase")
      .regex(/[a-z]/, "No lowercase")
      .regex(/[0-9]/, "No number"),
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

function RoleBadge({ role }: { role: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
      <Shield className="h-3 w-3" />
      {role}
    </span>
  );
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
      firstName: "",
      lastName: "",
      phone: "",
      email: invitation.email,
      password: "",
      confirmPassword: "",
    },
  });

  async function onSignup(data: SignupFormValues) {
    setIsSubmitting(true);
    setError("");

    try {
      const verification = await verifyInvitationStatus(
        invitation.invitationId,
      );
      if (!verification.valid) {
        throw new Error(verification.error || "Invitation is no longer valid.");
      }

      const signupResult = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: `${data.firstName} ${data.lastName}`,
      });

      if (signupResult.error) {
        throw new Error(signupResult.error.message);
      }

      await authClient.signIn.email({
        email: data.email,
        password: data.password,
      });

      const result = await authClient.organization.acceptInvitation({
        invitationId: invitation.invitationId,
      });

      if (result.error) {
        throw new Error(result.error.message || "Failed to accept invitation.");
      }

      await authClient.signOut();

      toast.success("Account created successfully", {
        description:
          "Your invitation has been accepted. Please sign in to continue.",
        duration: 5000,
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));
      window.location.href = "/auth/login";
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to create account. Please try again.";
      setError(errorMessage);
      setIsSubmitting(false);
    }
  }

  async function onLogin(data: Pick<SignupFormValues, "email" | "password">) {
    setIsSubmitting(true);
    setError("");

    try {
      const verification = await verifyInvitationStatus(
        invitation.invitationId,
      );
      if (!verification.valid) {
        throw new Error(verification.error || "Invitation is no longer valid.");
      }

      const loginResult = await authClient.signIn.email({
        email: data.email,
        password: data.password,
      });

      if (loginResult.error) {
        throw new Error(loginResult.error.message);
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));

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
      await new Promise((resolve) => setTimeout(resolve, 500));
      window.location.href = `/auth/callback?callbackUrl=${encodeURIComponent(result.redirectUrl)}`;
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to sign in. Please try again.";
      setError(errorMessage);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Invitation Context Card */}
      <div className="rounded-xl border border-blue-200/60 dark:border-blue-800/40 bg-blue-50/80 dark:bg-blue-950/30 backdrop-blur-sm p-4">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded border border-blue-200 dark:border-blue-800 flex items-center justify-center shrink-0 bg-white dark:bg-slate-900">
            <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="font-semibold text-[15px] text-slate-800 dark:text-slate-100 truncate">
                {invitation.schoolName}
              </p>
              <RoleBadge role={invitation.role || "member"} />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Invited by{" "}
              <span className="font-medium text-slate-600 dark:text-slate-300">
                {invitation.inviterName}
              </span>
            </p>
          </div>
          <CheckCircle2 className="h-6 w-6 text-blue-500 dark:text-blue-400 shrink-0" />
        </div>
      </div>

      {/* Form Card */}
      <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            {hasAccount ? "Sign in to accept" : "Create your account"}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {hasAccount
              ? "Use your existing credentials to join this school"
              : "Set up your profile and password to get started"}
          </p>
        </div>

        <div className="px-6 py-5">
          {error && (
            <Alert variant="destructive" className="mb-4 py-3 px-4 text-sm">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form
            onSubmit={form.handleSubmit(hasAccount ? onLogin : onSignup)}
            className="space-y-4"
          >
            <FieldGroup className="gap-4">
              {/* Row 1: Names (only for signup) */}
              {!hasAccount && (
                <div className="grid grid-cols-2 gap-4">
                  <Controller
                    name="firstName"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field
                        data-invalid={fieldState.invalid}
                        className="gap-2"
                      >
                        <FieldLabel
                          htmlFor="firstName"
                          className="text-sm font-semibold"
                        >
                          First Name
                        </FieldLabel>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            {...field}
                            id="firstName"
                            placeholder="John"
                            disabled={isSubmitting}
                            aria-invalid={fieldState.invalid}
                            className="pl-9 h-10 text-sm"
                          />
                        </div>
                        {fieldState.invalid && (
                          <FieldError
                            errors={[fieldState.error]}
                            className="text-xs"
                          />
                        )}
                      </Field>
                    )}
                  />
                  <Controller
                    name="lastName"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field
                        data-invalid={fieldState.invalid}
                        className="gap-2"
                      >
                        <FieldLabel
                          htmlFor="lastName"
                          className="text-sm font-semibold"
                        >
                          Last Name
                        </FieldLabel>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            {...field}
                            id="lastName"
                            placeholder="Doe"
                            disabled={isSubmitting}
                            aria-invalid={fieldState.invalid}
                            className="pl-9 h-10 text-sm"
                          />
                        </div>
                        {fieldState.invalid && (
                          <FieldError
                            errors={[fieldState.error]}
                            className="text-xs"
                          />
                        )}
                      </Field>
                    )}
                  />
                </div>
              )}

              {/* Row 2: Email and Phone */}
              <div
                className={
                  hasAccount ? "grid grid-cols-1" : "grid grid-cols-2 gap-4"
                }
              >
                {/* Email — always locked */}
                <Controller
                  name="email"
                  control={form.control}
                  render={({ field }) => (
                    <Field className="gap-2">
                      <FieldLabel
                        htmlFor="email"
                        className="text-sm font-semibold"
                      >
                        Email Address
                      </FieldLabel>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          {...field}
                          id="email"
                          type="email"
                          disabled
                          className="pl-9 h-10 text-sm bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                        />
                      </div>
                    </Field>
                  )}
                />

                {/* Phone — only for signup */}
                {!hasAccount && (
                  <Controller
                    name="phone"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field
                        data-invalid={fieldState.invalid}
                        className="gap-2"
                      >
                        <FieldLabel
                          htmlFor="phone"
                          className="text-sm font-semibold"
                        >
                          Phone{" "}
                          <span className="text-slate-400 font-normal ml-1 opacity-80">
                            (optional)
                          </span>
                        </FieldLabel>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            {...field}
                            id="phone"
                            type="tel"
                            placeholder="+233 XX XXX XXXX"
                            disabled={isSubmitting}
                            className="pl-9 h-10 text-sm"
                          />
                        </div>
                      </Field>
                    )}
                  />
                )}
              </div>

              {/* Row 3: Passwords */}
              <div
                className={
                  hasAccount ? "grid grid-cols-1" : "grid grid-cols-2 gap-4"
                }
              >
                {/* Password */}
                <Controller
                  name="password"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} className="gap-2">
                      <FieldLabel
                        htmlFor="password"
                        className="text-sm font-semibold"
                      >
                        {hasAccount ? "Password" : "Create Password"}
                      </FieldLabel>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          {...field}
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder={
                            hasAccount ? "Enter password" : "Strong password"
                          }
                          disabled={isSubmitting}
                          aria-invalid={fieldState.invalid}
                          className="pl-9 pr-10 h-10 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                          disabled={isSubmitting}
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {fieldState.invalid && (
                        <FieldError
                          errors={[fieldState.error]}
                          className="text-xs"
                        />
                      )}
                    </Field>
                  )}
                />

                {/* Confirm Password — only for signup */}
                {!hasAccount && (
                  <Controller
                    name="confirmPassword"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field
                        data-invalid={fieldState.invalid}
                        className="gap-2"
                      >
                        <FieldLabel
                          htmlFor="confirmPassword"
                          className="text-sm font-semibold"
                        >
                          Confirm Password
                        </FieldLabel>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            {...field}
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Re-enter password"
                            disabled={isSubmitting}
                            aria-invalid={fieldState.invalid}
                            className="pl-9 pr-10 h-10 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            disabled={isSubmitting}
                            tabIndex={-1}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        {fieldState.invalid && (
                          <FieldError
                            errors={[fieldState.error]}
                            className="text-xs"
                          />
                        )}
                      </Field>
                    )}
                  />
                )}
              </div>
            </FieldGroup>

            <Button
              type="submit"
              className="w-full h-10 text-sm font-semibold mt-2 cursor-pointer"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {hasAccount ? "Signing in..." : "Creating account..."}
                </>
              ) : hasAccount ? (
                "Sign In & Accept Invitation"
              ) : (
                "Create Account & Accept Invitation"
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-4 flex justify-between items-center border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-b-xl">
          <button
            type="button"
            onClick={() => {
              setHasAccount(!hasAccount);
              setError("");
            }}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            disabled={isSubmitting}
          >
            {hasAccount
              ? "Don't have an account? Create one"
              : "Already have an account? Sign in"}
          </button>
          {hasAccount && (
            <Link
              href="/auth/forgot-password"
              className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              Forgot password?
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
