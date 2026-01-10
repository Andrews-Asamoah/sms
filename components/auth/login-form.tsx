// components/auth/login-form.tsx
"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  AlertCircle,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  rememberMe: z.boolean(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    control,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setError("");

    try {
      const result = await signIn.email({
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe,
        callbackURL: "/callback",
      });

      if (result?.error) {
        setError(
          result.error.message || "Invalid credentials. Please try again."
        );
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      console.error("Login error:", err);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <Alert
          variant="destructive"
          className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <FieldGroup>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="email">Email Address</FieldLabel>
          <div className="relative">
            <Input
              startIcon={<Mail />}
              {...register("email")}
              id="email"
              type="email"
              placeholder="you@school.edu"
              className="pl-10 bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700"
              disabled={isSubmitting}
              aria-invalid={!!errors.email}
            />
          </div>
          <FieldError errors={[errors.email]} />
        </Field>

        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <div className="relative">
            <Input
              startIcon={<Lock />}
              {...register("password")}
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              className="pl-10 pr-10 bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700"
              disabled={isSubmitting}
              aria-invalid={!!errors.password}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
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

        <div className="flex items-center justify-between">
          <Field orientation="horizontal" className="w-auto">
            <Controller
              name="rememberMe"
              control={control}
              render={({ field }) => (
                <>
                  <Checkbox
                    id="rememberMe"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isSubmitting}
                    className="border-slate-300 dark:border-slate-600"
                  />
                  <FieldLabel
                    htmlFor="rememberMe"
                    className="font-normal cursor-pointer text-slate-700 dark:text-slate-300"
                  >
                    Remember me
                  </FieldLabel>
                </>
              )}
            />
          </Field>
          <Link
            href="/forgot-password"
            className={cn(
              "text-sm w-auto font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors",
              isSubmitting && "pointer-events-none opacity-50"
            )}
            tabIndex={isSubmitting ? -1 : 0}
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          className="w-full bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
          size="lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              Sign In
              <ArrowRight className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>
      </FieldGroup>

      <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
        <p>
          Need help?{" "}
          <Link
            href="/support"
            className={cn(
              "text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors",
              isSubmitting && "pointer-events-none opacity-50"
            )}
            tabIndex={isSubmitting ? -1 : 0}
          >
            Contact Support
          </Link>
        </p>
      </div>
    </form>
  );
}
