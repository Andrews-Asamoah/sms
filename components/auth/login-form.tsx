// components/auth/login-form.tsx - FIXED WITH THEME COLORS
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface AuthError {
  message?: string;
  status?: number;
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setError("");

    try {
      console.log("🔐 [Login] Attempting login for:", data.email);

      const result = await authClient.signIn.email({
        email: data.email,
        password: data.password,
      });

      if (result.error) {
        console.error("❌ [Login] Error:", result.error);
        throw new Error(result.error.message || "Invalid email or password");
      }

      console.log("✅ [Login] Success!");
      setIsSuccess(true);

      // Give Better Auth time to establish session and show success state
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Always redirect to /auth/callback
      // The callback page will handle role-based routing
      console.log("🔄 [Login] Redirecting to /auth/callback");

      window.location.href = "/auth/callback";
    } catch (err) {
      console.error("❌ [Login] Failed:", err);

      const authError = err as AuthError;

      if (authError.message?.includes("Invalid email or password")) {
        setError("Invalid email or password. Please try again.");
      } else if (authError.message?.includes("User not found")) {
        setError("No account found with this email address.");
      } else if (authError.message?.includes("Account is banned")) {
        setError("Your account has been suspended. Please contact support.");
      } else {
        setError(authError.message || "Failed to sign in. Please try again.");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup className="space-y-4">
        {error && (
          <Alert
            variant="destructive"
            className="bg-destructive/10 border-destructive/20 text-destructive dark:text-red-400"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm font-medium">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <Field data-invalid={!!errors.email} className="space-y-1.5">
          <FieldLabel
            htmlFor="email"
            className="text-slate-700 dark:text-slate-300 font-medium"
          >
            Email Address
          </FieldLabel>
          <div className="relative group">
            <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
            <Input
              {...register("email")}
              id="email"
              type="email"
              placeholder="you@school.edu"
              className="pl-11 h-12 bg-slate-50/50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-300 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 hover:border-slate-300 dark:hover:border-slate-600"
              disabled={isSubmitting}
              aria-invalid={!!errors.email}
              autoComplete="email"
            />
          </div>
          <FieldError className="text-xs" errors={[errors.email]} />
        </Field>

        <Field data-invalid={!!errors.password} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <FieldLabel
              htmlFor="password"
              className="text-slate-700 dark:text-slate-300 font-medium"
            >
              Password
            </FieldLabel>
            <Link
              href="/auth/forgot-password"
              className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
              tabIndex={-1}
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative group">
            <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
            <Input
              {...register("password")}
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="pl-11 pr-11 h-12 bg-slate-50/50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-300 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 hover:border-slate-300 dark:hover:border-slate-600 tracking-wider placeholder:tracking-normal"
              disabled={isSubmitting}
              aria-invalid={!!errors.password}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
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
          <FieldError className="text-xs" errors={[errors.password]} />
        </Field>

        <Button
          type="submit"
          className={`w-full h-11 sm:h-12 mt-1 sm:mt-2 font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-300 ${
            isSuccess
              ? "bg-green-500 hover:bg-green-600 text-white shadow-green-500/25"
              : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-purple-500/25"
          }`}
          disabled={isSubmitting || isSuccess}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Authenticating...
            </>
          ) : isSuccess ? (
            <>
              <CheckCircle2 className="mr-2 h-5 w-5 animate-in zoom-in duration-300" />
              Sign in successful
            </>
          ) : (
            <>
              Sign in to platform
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </Button>

        {callbackUrl && (
          <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-4">
            You will be redirected automatically
          </p>
        )}
      </FieldGroup>
    </form>
  );
}
