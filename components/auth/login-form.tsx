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
      <FieldGroup>
        {error && (
          <Alert variant="destructive" className="backdrop-blur-sm">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">Email Address</FieldLabel>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              {...register("email")}
              id="email"
              type="email"
              placeholder="you@school.edu"
              className="pl-10 bg-background/50 backdrop-blur-sm"
              disabled={isSubmitting}
              aria-invalid={!!errors.email}
              autoComplete="email"
            />
          </div>
          <FieldError errors={[errors.email]} />
        </Field>

        <Field data-invalid={!!errors.password}>
          <div className="flex items-center justify-between mb-2">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Link
              href="/auth/forgot-password"
              className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
              tabIndex={-1}
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              {...register("password")}
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              className="pl-10 pr-10 bg-background/50 backdrop-blur-sm"
              disabled={isSubmitting}
              aria-invalid={!!errors.password}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
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
          <FieldError errors={[errors.password]} />
        </Field>

        <Button
          type="submit"
          className={`w-full shadow-lg hover:shadow-xl transition-all duration-500 ${
            isSuccess ? "bg-green-600 hover:bg-green-600 text-white" : ""
          }`}
          size="lg"
          disabled={isSubmitting || isSuccess}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Signing in...
            </>
          ) : isSuccess ? (
            <>
              <CheckCircle2 className="mr-2 h-5 w-5 animate-in zoom-in duration-300" />
              Success! Preparing Dashboard...
            </>
          ) : (
            <>
              Sign In
              <ArrowRight className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>

        {callbackUrl && (
          <p className="text-xs text-center text-muted-foreground bg-muted/50 p-2 rounded">
            You&apos;ll be redirected after signing in
          </p>
        )}
      </FieldGroup>
    </form>
  );
}
