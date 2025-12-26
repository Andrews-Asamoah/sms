"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import * as z from "zod";
import {
  Loader2,
  Mail,
  Lock,
  User,
  Phone,
  Calendar,
  MapPin,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Validation schema
const setupSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[^A-Za-z0-9]/,
      "Password must contain at least one special character"
    ),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  gender: z.enum(["MALE", "FEMALE"], {
    required_error: "Please select a gender",
  }),
  dob: z.string().min(1, "Please select your date of birth"),
});

export default function SetupWizard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  const form = useForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      gender: "MALE" as "MALE" | "FEMALE",
      dob: "",
    },
    validators: {
      onSubmit: setupSchema,
    },
    onSubmit: async ({ value }) => {
      // Check password match
      if (value.password !== value.confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/setup/super-admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: value.firstName,
            lastName: value.lastName,
            email: value.email,
            phone: value.phone,
            password: value.password,
            gender: value.gender,
            dob: value.dob,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to create super admin");
        }

        // Redirect to login
        router.push("/login?setup=success");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create account"
        );
      } finally {
        setIsLoading(false);
      }
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="space-y-2 text-center border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
          <CardTitle className="text-3xl font-bold">Wesley SMS Setup</CardTitle>
          <CardDescription className="text-blue-50">
            Create your Super Administrator account
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="mb-6">
            <div className="flex justify-between items-center">
              <div
                className={`flex items-center ${
                  step >= 1 ? "text-blue-600" : "text-gray-400"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step >= 1 ? "bg-blue-600 text-white" : "bg-gray-200"
                  }`}
                >
                  1
                </div>
                <span className="ml-2 text-sm font-medium">Personal Info</span>
              </div>
              <div className="flex-1 h-0.5 mx-4 bg-gray-200">
                <div
                  className={`h-full ${
                    step >= 2 ? "bg-blue-600" : ""
                  } transition-all`}
                  style={{ width: step >= 2 ? "100%" : "0%" }}
                ></div>
              </div>
              <div
                className={`flex items-center ${
                  step >= 2 ? "text-blue-600" : "text-gray-400"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step >= 2 ? "bg-blue-600 text-white" : "bg-gray-200"
                  }`}
                >
                  2
                </div>
                <span className="ml-2 text-sm font-medium">Security</span>
              </div>
            </div>
          </div>

          <div
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isLoading) {
                e.preventDefault();
                if (step === 1) {
                  setStep(2);
                } else {
                  form.handleSubmit();
                }
              }
            }}
          >
            <FieldGroup>
              {step === 1 && (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    <form.Field name="firstName">
                      {(field) => {
                        const isInvalid =
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid;
                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor="firstName">
                              First Name
                            </FieldLabel>
                            <Input
                              startIcon={
                                <User className="text-muted-foreground" />
                              }
                              id="firstName"
                              name={field.name}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                              placeholder="John"
                              disabled={isLoading}
                            />
                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                          </Field>
                        );
                      }}
                    </form.Field>

                    <form.Field name="lastName">
                      {(field) => {
                        const isInvalid =
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid;
                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor="lastName">
                              Last Name
                            </FieldLabel>
                            <Input
                              startIcon={
                                <User className="text-muted-foreground" />
                              }
                              id="lastName"
                              name={field.name}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                              placeholder="Doe"
                              disabled={isLoading}
                            />
                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                          </Field>
                        );
                      }}
                    </form.Field>
                  </div>

                  <form.Field name="email">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor="email">Email Address</FieldLabel>
                          <Input
                            startIcon={
                              <Mail className="text-muted-foreground" />
                            }
                            id="email"
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            type="email"
                            placeholder="admin@wesleysms.edu"
                            disabled={isLoading}
                          />
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                  </form.Field>

                  <form.Field name="phone">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor="phone">Phone Number</FieldLabel>
                          <Input
                            startIcon={
                              <Phone className="text-muted-foreground" />
                            }
                            id="phone"
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            type="tel"
                            placeholder="+233 XX XXX XXXX"
                            disabled={isLoading}
                          />
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                  </form.Field>

                  <div className="grid md:grid-cols-2 gap-4">
                    <form.Field name="gender">
                      {(field) => {
                        const isInvalid =
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid;
                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor="gender">Gender</FieldLabel>
                            <Select
                              value={field.state.value}
                              onValueChange={(value) =>
                                field.handleChange(value as "MALE" | "FEMALE")
                              }
                              disabled={isLoading}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MALE">Male</SelectItem>
                                <SelectItem value="FEMALE">Female</SelectItem>
                              </SelectContent>
                            </Select>
                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                          </Field>
                        );
                      }}
                    </form.Field>

                    <form.Field name="dob">
                      {(field) => {
                        const isInvalid =
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid;
                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor="dob">Date of Birth</FieldLabel>
                            <Input
                              startIcon={
                                <Calendar className="text-muted-foreground" />
                              }
                              id="dob"
                              name={field.name}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                              type="date"
                              disabled={isLoading}
                            />
                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                          </Field>
                        );
                      }}
                    </form.Field>
                  </div>

                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => setStep(2)}
                    disabled={isLoading}
                  >
                    Continue
                  </Button>
                </>
              )}

              {step === 2 && (
                <>
                  <form.Field name="password">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor="password">Password</FieldLabel>
                          <Input
                            startIcon={
                              <Lock className="text-muted-foreground" />
                            }
                            id="password"
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            type="password"
                            placeholder="••••••••"
                            disabled={isLoading}
                          />
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Must be 8+ characters with uppercase, lowercase,
                            number, and special character
                          </p>
                        </Field>
                      );
                    }}
                  </form.Field>

                  <form.Field name="confirmPassword">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor="confirmPassword">
                            Confirm Password
                          </FieldLabel>
                          <Input
                            startIcon={
                              <Lock className="text-muted-foreground" />
                            }
                            id="confirmPassword"
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            type="password"
                            placeholder="••••••••"
                            disabled={isLoading}
                          />
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      );
                    }}
                  </form.Field>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => setStep(1)}
                      disabled={isLoading}
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      className="w-full"
                      disabled={isLoading}
                      onClick={() => form.handleSubmit()}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        "Create Super Admin Account"
                      )}
                    </Button>
                  </div>
                </>
              )}
            </FieldGroup>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
