// app/(auth)/forgot-password/page.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Mail,
  AlertCircle,
  Loader2,
  ArrowLeft,
  CheckCircle,
  Send,
} from "lucide-react";
import Link from "next/link";
import { AuthCardWrapper } from "@/components/shared/auth-card-wrapper";
import { authClient } from "@/lib/auth-client";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setError("");
    setSuccess(false);

    try {
      await authClient.requestPasswordReset({
        email: data.email,
        redirectTo: "/reset-password",
      });

      setSubmittedEmail(data.email);
      setSuccess(true);
      reset();
    } catch (err: any) {
      setError(err.message || "Failed to send reset email. Please try again.");
    }
  };

  return (
    <AuthCardWrapper
      title={success ? "Check your email" : "Reset your password"}
      description={
        success
          ? `We've sent a password reset link to ${submittedEmail}`
          : `Enter your email address and we'll send you a link to reset your password`
      }
    >
      {success ? (
        <FieldGroup>
          <Alert className="border-green-200 bg-green-50/80 dark:bg-green-950/20 dark:border-green-800 backdrop-blur-sm">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Password reset link has been sent! Please check your inbox and
              spam folder.
            </AlertDescription>
          </Alert>

          <FieldDescription className="text-center text-sm text-slate-600 dark:text-slate-400">
            Didn&apos;t receive the email? Check your spam folder or{" "}
            <button
              onClick={() => setSuccess(false)}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
            >
              try again
            </button>
          </FieldDescription>

          <Button
            asChild
            variant="outline"
            className="w-full bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
            size="lg"
          >
            <Link href="/login">
              <ArrowLeft className="mr-2 h-5 w-5" />
              Back to Login
            </Link>
          </Button>
        </FieldGroup>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            {error && (
              <Alert
                variant="destructive"
                className="bg-red-50/80 dark:bg-red-950/20 backdrop-blur-sm"
              >
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="email">Email Address</FieldLabel>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
                <Input
                  {...register("email")}
                  id="email"
                  type="email"
                  placeholder="you@school.edu"
                  className="pl-10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-slate-200 dark:border-slate-700"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.email}
                />
              </div>
              <FieldError errors={[errors.email]} />
              <FieldDescription className="text-slate-600 dark:text-slate-400">
                Enter the email address associated with your account
              </FieldDescription>
            </Field>

            <Button
              type="submit"
              className="w-full bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Sending Reset Link...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-5 w-5" />
                  Send Reset Link
                </>
              )}
            </Button>

            <Button
              asChild
              variant="ghost"
              className="w-full"
              size="lg"
              disabled={isSubmitting}
            >
              <Link href="/login">
                <ArrowLeft className="mr-2 h-5 w-5" />
                Back to Login
              </Link>
            </Button>
          </FieldGroup>
        </form>
      )}
    </AuthCardWrapper>
  );
}
