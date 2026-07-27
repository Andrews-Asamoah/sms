// components/auth/login-form.tsx
"use client";

import { useState, useEffect } from "react";
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
  WifiOff,
  ServerCrash,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

const loginSchema = z.object({
  email: z.email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// ============================================================================
// ERROR CLASSIFICATION
// ============================================================================

type ErrorType =
  | "credentials"   // Wrong email / password
  | "banned"        // Account suspended
  | "connectivity"  // No internet / server unreachable
  | "server"        // Server-side error (5xx) that is not a DB timeout
  | "generic";      // Catch-all

interface ClassifiedError {
  type: ErrorType;
  message: string;
}

/**
 * Keywords that indicate a database connection or server-side connectivity
 * problem rather than an actual authentication failure.
 */
const CONNECTIVITY_KEYWORDS = [
  "connection timeout",
  "connection terminated",
  "server has closed the connection",
  "connectionclosed",
  "econnrefused",
  "enotfound",
  "etimedout",
  "network error",
  "fetch failed",
  "failed to fetch",
  "networkerror",
  "unable to connect",
  "database",
  "prisma",
  "p1017",         // Prisma: Server has closed the connection
  "p1001",         // Prisma: Can't reach database server
  "p1008",         // Prisma: Operations timed out
  "p1002",         // Prisma: Database server was reached but timed out
];

function classifyError(
  err: unknown,
  status?: number,
  message?: string,
): ClassifiedError {
  const rawMsg = (message ?? (err instanceof Error ? err.message : String(err))).toLowerCase();

  // 1. Explicit browser offline
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return {
      type: "connectivity",
      message:
        "You appear to be offline. Please check your internet connection and try again.",
    };
  }

  // 2. Server returned 5xx
  if (status && status >= 500) {
    // Check if it looks like a DB / network issue
    if (CONNECTIVITY_KEYWORDS.some((kw) => rawMsg.includes(kw))) {
      return {
        type: "connectivity",
        message:
          "The server cannot be reached right now. This is usually caused by a poor internet connection. Please check your connection and try again.",
      };
    }
    return {
      type: "server",
      message:
        "The server encountered an unexpected error. Please try again in a moment.",
    };
  }

  // 3. Message contains connectivity keywords
  if (CONNECTIVITY_KEYWORDS.some((kw) => rawMsg.includes(kw))) {
    return {
      type: "connectivity",
      message:
        "Unable to reach the server. This is usually caused by a poor internet connection. Please check your connection and try again.",
    };
  }

  // 4. Banned
  if (rawMsg.includes("banned") || rawMsg.includes("suspended")) {
    return { type: "banned", message: message ?? "Your account has been suspended." };
  }

  // 5. Wrong credentials
  if (
    rawMsg.includes("invalid email or password") ||
    rawMsg.includes("invalid credentials") ||
    rawMsg.includes("user not found") ||
    status === 401 ||
    status === 403
  ) {
    return {
      type: "credentials",
      message: rawMsg.includes("user not found")
        ? "No account found with this email address."
        : "Invalid email or password. Please try again.",
    };
  }

  return { type: "generic", message: message ?? "Something went wrong. Please try again." };
}

// ============================================================================
// COMPONENT
// ============================================================================

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<ClassifiedError | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  // Track online / offline status in real-time
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Clear connectivity errors when connection is restored
      setError((prev) =>
        prev?.type === "connectivity" ? null : prev,
      );
    };
    const handleOffline = () => {
      setIsOnline(false);
      // Clear any existing errors — the offline banner handles the messaging
      setError(null);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

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
    setError(null);

    try {
      const result = await authClient.signIn.email({
        email: data.email,
        password: data.password,
      });

      if (result.error) {
        const { error: authErr } = result;
        const status = authErr.status ?? undefined;
        const message = authErr.message ?? undefined;

        // Handle banned account — fetch detailed reason
        const classified = classifyError(authErr, status, message);

        if (classified.type === "banned") {
          try {
            const res = await fetch(
              `/api/auth/ban-reason?email=${encodeURIComponent(data.email)}`,
            );
            if (res.ok) {
              const json = await res.json();
              if (json.reason) {
                setError({
                  type: "banned",
                  message: `Your account has been suspended. Reason: ${json.reason}`,
                });
                return;
              }
            }
          } catch (e) {
            console.error("Failed to fetch ban reason", e);
          }
          setError({
            type: "banned",
            message: "Your account has been suspended. Please contact support.",
          });
          return;
        }

        setError(classified);
        return;
      }

      setIsSuccess(true);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      window.location.href = "/auth/callback";
    } catch (err) {
      // Network-level error (fetch itself threw — e.g. DNS failure, no internet)
      setError(classifyError(err));
    }
  };

  // -------------------------------------------------------------------------
  // ERROR ALERT RENDERING
  // -------------------------------------------------------------------------

  function renderError() {
    if (!error) return null;

    const isConnectivity = error.type === "connectivity";
    const isServer = error.type === "server";

    const Icon = isConnectivity
      ? WifiOff
      : isServer
        ? ServerCrash
        : AlertCircle;

    const baseClasses = isConnectivity || isServer
      ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-700/50 dark:text-amber-300"
      : "bg-destructive/10 border-destructive/20 text-destructive dark:text-red-400";

    return (
      <Alert
        variant={isConnectivity || isServer ? "default" : "destructive"}
        className={`${baseClasses} py-2 px-3`}
      >
        <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <AlertDescription className="text-xs font-medium space-y-1">
          <span className="block">{error.message}</span>
          {(isConnectivity || isServer) && (
            <span className="flex items-center gap-1 text-[11px] opacity-75">
              <RefreshCw className="h-3 w-3" />
              Check your connection and try submitting again.
            </span>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup className="space-y-3">
        {/* Offline banner — only show this when offline; suppress other errors */}
        {!isOnline ? (
          <Alert className="bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-700/50 dark:text-amber-300 py-2 px-3">
            <WifiOff className="h-3.5 w-3.5 shrink-0" />
            <AlertDescription className="text-xs font-medium">
              No internet connection detected. Please check your connection.
            </AlertDescription>
          </Alert>
        ) : (
          renderError()
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
