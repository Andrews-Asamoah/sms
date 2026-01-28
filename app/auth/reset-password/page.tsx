// app/auth/reset-password/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import {
  Lock,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { resetPassword } from "@/lib/auth-client";

// ============================================================================
// CONSTANTS
// ============================================================================

const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
} as const;

const REDIRECT_DELAY = 2000; // 2 seconds

// ============================================================================
// FORM VALIDATION SCHEMA
// ============================================================================

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(
        PASSWORD_REQUIREMENTS.minLength,
        `Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`,
      )
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

// ============================================================================
// COMPONENT
// ============================================================================

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract token and error from URL
  const token = searchParams.get("token");
  const urlError = searchParams.get("error");

  // Component state
  const [localError, setLocalError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Handle URL error parameter
  useEffect(() => {
    if (urlError) {
      setLocalError(
        decodeURIComponent(urlError) ||
          "Invalid or expired reset link. Please request a new one.",
      );
    }
  }, [urlError]);

  // ============================================================================
  // FORM SUBMISSION HANDLER
  // ============================================================================

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) {
      setLocalError("Reset token is missing");
      return;
    }

    setLocalError("");
    setSuccess(false);

    try {
      // Use Better Auth's native resetPassword method
      const { error: authError } = await resetPassword({
        newPassword: data.password,
        token,
      });

      if (authError) {
        throw new Error(authError.message || "Failed to reset password");
      }

      setSuccess(true);

      // Redirect to login after delay
      setTimeout(() => {
        router.push("/auth/login?message=password-reset-success");
      }, REDIRECT_DELAY);
    } catch (err) {
      console.error("[ResetPassword] Error:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to reset password. The link may have expired. Please request a new one.";
      setLocalError(errorMessage);
    }
  };

  // ============================================================================
  // RENDER GUARDS
  // ============================================================================

  // Show error if no token
  if (!token && !urlError) {
    return <InvalidTokenCard />;
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Card className="w-full max-w-md backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-white/20 shadow-2xl">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Lock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <CardTitle className="text-2xl">Reset Password</CardTitle>
        <CardDescription>Enter your new password below</CardDescription>
      </CardHeader>

      <CardContent>
        {success ? (
          <SuccessView />
        ) : (
          <ResetPasswordForm
            register={register}
            handleSubmit={handleSubmit}
            onSubmit={onSubmit}
            errors={errors}
            localError={localError}
            urlError={urlError}
            isSubmitting={isSubmitting}
            showPassword={showPassword}
            showConfirmPassword={showConfirmPassword}
            setShowPassword={setShowPassword}
            setShowConfirmPassword={setShowConfirmPassword}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// INVALID TOKEN CARD COMPONENT
// ============================================================================

function InvalidTokenCard() {
  return (
    <Card className="w-full max-w-md backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-white/20 shadow-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Invalid Reset Link</CardTitle>
        <CardDescription>
          This password reset link is invalid or has expired
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild className="w-full">
          <Link href="/auth/forgot-password">Request New Link</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SUCCESS VIEW COMPONENT
// ============================================================================

function SuccessView() {
  return (
    <div className="space-y-4">
      <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800 dark:text-green-200">
          Password reset successfully! Redirecting to login...
        </AlertDescription>
      </Alert>
    </div>
  );
}

// ============================================================================
// FORM COMPONENT
// ============================================================================

interface ResetPasswordFormProps {
  register: ReturnType<typeof useForm<ResetPasswordFormValues>>["register"];
  handleSubmit: ReturnType<
    typeof useForm<ResetPasswordFormValues>
  >["handleSubmit"];
  onSubmit: (data: ResetPasswordFormValues) => Promise<void>;
  errors: ReturnType<
    typeof useForm<ResetPasswordFormValues>
  >["formState"]["errors"];
  localError: string;
  urlError: string | null;
  isSubmitting: boolean;
  showPassword: boolean;
  showConfirmPassword: boolean;
  setShowPassword: (show: boolean) => void;
  setShowConfirmPassword: (show: boolean) => void;
}

function ResetPasswordForm({
  register,
  handleSubmit,
  onSubmit,
  errors,
  localError,
  urlError,
  isSubmitting,
  showPassword,
  showConfirmPassword,
  setShowPassword,
  setShowConfirmPassword,
}: ResetPasswordFormProps) {
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        {/* Error Alert */}
        {(localError || urlError) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {localError || (urlError ? decodeURIComponent(urlError) : "")}
            </AlertDescription>
          </Alert>
        )}

        {/* Password Field */}
        <PasswordField
          id="password"
          label="New Password"
          placeholder="Create a strong password"
          register={register("password")}
          error={errors.password}
          isSubmitting={isSubmitting}
          showPassword={showPassword}
          onToggleVisibility={() => setShowPassword(!showPassword)}
        />

        {/* Confirm Password Field */}
        <PasswordField
          id="confirmPassword"
          label="Confirm Password"
          placeholder="Re-enter your password"
          register={register("confirmPassword")}
          error={errors.confirmPassword}
          isSubmitting={isSubmitting}
          showPassword={showConfirmPassword}
          onToggleVisibility={() =>
            setShowConfirmPassword(!showConfirmPassword)
          }
        />

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          size="lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Resetting...
            </>
          ) : (
            <>Reset Password</>
          )}
        </Button>

        {/* Back to Login */}
        <div className="text-center">
          <Link
            href="/auth/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </FieldGroup>
    </form>
  );
}

// ============================================================================
// PASSWORD FIELD COMPONENT (DRY)
// ============================================================================

interface PasswordFieldProps {
  id: string;
  label: string;
  placeholder: string;
  register: ReturnType<ReturnType<typeof useForm>["register"]>;
  error: { message?: string } | undefined;
  isSubmitting: boolean;
  showPassword: boolean;
  onToggleVisibility: () => void;
}

function PasswordField({
  id,
  label,
  placeholder,
  register,
  error,
  isSubmitting,
  showPassword,
  onToggleVisibility,
}: PasswordFieldProps) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          {...register}
          id={id}
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          className="pl-10 pr-10"
          disabled={isSubmitting}
          aria-invalid={!!error}
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          disabled={isSubmitting}
          tabIndex={-1}
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <EyeOff className="h-5 w-5" />
          ) : (
            <Eye className="h-5 w-5" />
          )}
        </button>
      </div>
      <FieldError errors={[error]} />
    </Field>
  );
}
