"use client";

import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import * as z from "zod";
import { Loader2, Mail, Lock } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signIn } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

// Validation schema
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onSubmit: loginSchema,
    },
    onSubmit: async ({ value }) => {
      setIsLoading(true);
      setError(null);

      try {
        // Integrate with better-auth here
        const res = await signIn.email({
          email: value.email,
          password: value.password,
        });

        if (res.error) {
          throw new Error(res.error.message || "Invalid email or password");
        }
        router.push("/dashboard");
        // On success, better-auth will handle redirect to dashboard
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Invalid email or password"
        );
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-blue-600 p-4">
      <Card className="w-full max-w-md shadow-xl border-slate-200 dark:border-slate-800">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-base">
            Sign in to your school management account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            id="login-form"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isLoading) {
                e.preventDefault();
                form.handleSubmit();
              }
            }}
          >
            <FieldGroup>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form.Field name="email">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor="login-email">Email</FieldLabel>
                      <Input
                        startIcon={<Mail className="text-muted-foreground" />}
                        id="login-email"
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        type="email"
                        placeholder="admin@school.edu"
                        disabled={isLoading}
                        autoComplete="email"
                        aria-invalid={isInvalid}
                      />

                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              </form.Field>

              <form.Field name="password">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  return (
                    <Field data-invalid={isInvalid}>
                      <div className="flex items-center justify-between">
                        <FieldLabel htmlFor="login-password">
                          Password
                        </FieldLabel>
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs"
                          disabled={isLoading}
                          onClick={() => {
                            // Navigate to forgot password page
                            // router.push("/auth/forgot-password");
                            console.log("Navigate to forgot password");
                          }}
                        >
                          Forgot password?
                        </Button>
                      </div>
                      <div className="relative">
                        <Input
                          startIcon={<Lock className="text-muted-foreground" />}
                          id="login-password"
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          type="password"
                          placeholder="••••••••"
                          disabled={isLoading}
                          autoComplete="current-password"
                          aria-invalid={isInvalid}
                        />
                      </div>
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  );
                }}
              </form.Field>

              <Button
                type="button"
                className="w-full"
                disabled={isLoading}
                onClick={() => form.handleSubmit()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </FieldGroup>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
