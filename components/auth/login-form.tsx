// components/auth/login-form.tsx
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
  email: z.email("Please enter a valid email address"),
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
      const result = await authClient.signIn.email({
        email: data.email,
        password: data.password,
      });

      if (result.error) {
        const msg = result.error.message || "Invalid email or password";

        if (msg.toLowerCase().includes("banned")) {
          try {
            const res = await fetch(
              `/api/auth/ban-reason?email=${encodeURIComponent(data.email)}`,
            );
            if (res.ok) {
              const json = await res.json();
              if (json.reason) {
                setError(
                  `Your account has been suspended. Reason: ${json.reason}`,
                );
                return;
              }
            }
          } catch (e) {
            console.error("Failed to fetch ban reason", e);
          }
          setError("Your account has been suspended. Please contact support.");
          return;
        }

        if (msg.includes("Invalid email or password")) {
          setError("Invalid email or password. Please try again.");
        } else if (msg.includes("User not found")) {
          setError("No account found with this email address.");
        } else {
          setError(msg);
        }
        return;
      }

      setIsSuccess(true);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      window.location.href = "/auth/callback";
    } catch (err) {
      const authError = err as AuthError;
      setError(authError.message || "Failed to sign in. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup className="space-y-3">
        {error && (
          <Alert
            variant="destructive"
            className="bg-destructive/10 border-destructive/20 text-destructive dark:text-red-400 py-2 px-3"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <AlertDescription className="text-xs font-medium">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Email */}
        <Field data-invalid={!!errors.email} className="space-y-1">
          <FieldLabel
            htmlFor="email"
            className="text-sm text-slate-700 dark:text-slate-300 font-medium"
          >
            Email Address
          </FieldLabel>
          <div className="relative group">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
            <Input
              {...register("email")}
              id="email"
              type="email"
              placeholder="you@school.edu"
              className="pl-9 h-10 text-sm bg-slate-50/50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
              disabled={isSubmitting}
              aria-invalid={!!errors.email}
              autoComplete="email"
            />
          </div>
          <FieldError className="text-xs" errors={[errors.email]} />
        </Field>

        {/* Password */}
        <Field data-invalid={!!errors.password} className="space-y-1">
          <div className="flex items-center justify-between">
            <FieldLabel
              htmlFor="password"
              className="text-sm text-slate-700 dark:text-slate-300 font-medium"
            >
              Password
            </FieldLabel>
            <Link
              href="/auth/forgot-password"
              className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 transition-colors"
              tabIndex={-1}
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative group">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
            <Input
              {...register("password")}
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="pl-9 pr-10 h-10 text-sm bg-slate-50/50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all tracking-wider placeholder:tracking-normal"
              disabled={isSubmitting}
              aria-invalid={!!errors.password}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              disabled={isSubmitting}
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <FieldError className="text-xs" errors={[errors.password]} />
        </Field>

        {/* Submit */}
        <Button
          type="submit"
          className={`w-full h-10 mt-1 font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-300 ${
            isSuccess
              ? "bg-green-500 hover:bg-green-600 text-white"
              : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0"
          }`}
          disabled={isSubmitting || isSuccess}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Authenticating...
            </>
          ) : isSuccess ? (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Sign in successful
            </>
          ) : (
            <>
              Sign in to platform
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>

        {callbackUrl && (
          <p className="text-xs text-center text-slate-400 dark:text-slate-500">
            You will be redirected automatically
          </p>
        )}
      </FieldGroup>
    </form>
  );
}
