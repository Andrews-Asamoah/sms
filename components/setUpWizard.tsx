// app/setup/page.tsx or components/setup-wizard.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  Mail,
  Lock,
  User,
  Phone,
  Calendar,
  Building2,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { setupBaseSchema, type SetupFormData } from "@/schemas/index";

export default function SetupWizard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<SetupFormData>({
    resolver: zodResolver(setupBaseSchema.refine(
      (data) => data.password === data.confirmPassword,
      {
        message: "Passwords do not match",
        path: ["confirmPassword"],
      }
    )),
    mode: "onChange",
    defaultValues: {
      schoolName: "",
      schoolEmail: "",
      schoolPhone: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      gender: "MALE",
      dob: "",
    },
  });

  // Watch all form values for validation
  const formValues = watch();

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  // Check if current step is valid
  const canProceedToNextStep = (() => {
    if (step === 1) {
      const hasValues = formValues.schoolName?.trim();
      const noErrors = !errors.schoolName;
      return hasValues && noErrors;
    }

    if (step === 2) {
      const hasValues = 
        formValues.firstName?.trim() && 
        formValues.lastName?.trim() && 
        formValues.email?.trim() && 
        formValues.phone?.trim() && 
        formValues.dob;
      const noErrors = 
        !errors.firstName && 
        !errors.lastName && 
        !errors.email && 
        !errors.phone && 
        !errors.dob;
      return hasValues && noErrors;
    }

    if (step === 3) {
      const hasValues = formValues.password?.trim() && formValues.confirmPassword?.trim();
      const noErrors = !errors.password && !errors.confirmPassword;
      const passwordsMatch = formValues.password === formValues.confirmPassword;
      return hasValues && noErrors && passwordsMatch;
    }

    return false;
  })();

  const handleNext = async () => {
    let isValid = false;

    if (step === 1) {
      isValid = await trigger(["schoolName"]);
    } else if (step === 2) {
      isValid = await trigger(["firstName", "lastName", "email", "phone", "dob", "gender"]);
    } else if (step === 3) {
      isValid = await trigger(["password", "confirmPassword"]);
    }

    if (isValid && step < totalSteps) {
      setStep(step + 1);
      setError(null);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError(null);
    }
  };

  const onSubmit = async (data: SetupFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/setup/super-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to complete setup");
      }

      router.replace("/login?setup=success");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create account"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-3 sm:p-4 md:p-6 flex items-center justify-center">
      <Card className="w-full max-w-2xl shadow-2xl">
        <CardHeader className="space-y-2 text-center border-b bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-t-lg p-4 sm:p-6">
          <div className="flex items-center justify-center mb-2">
            <Building2 className="h-8 w-8 sm:h-10 sm:w-10 mr-3" />
            <CardTitle className="text-2xl sm:text-3xl font-bold">
              School Management Setup
            </CardTitle>
          </div>
          <CardDescription className="text-blue-50 text-sm sm:text-base">
            {step === 1 && "Configure your school information"}
            {step === 2 && "Create administrator account"}
            {step === 3 && "Set security credentials"}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs sm:text-sm font-medium text-gray-600">
                Step {step} of {totalSteps}
              </span>
              <span className="text-xs sm:text-sm font-medium text-gray-600">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Step Indicators */}
          <div className="flex justify-between mb-8 px-2">
            {[
              { num: 1, label: "School", icon: Building2 },
              { num: 2, label: "Admin", icon: User },
              { num: 3, label: "Security", icon: Lock },
            ].map(({ num, label, icon: Icon }) => (
              <div key={num} className="flex flex-col items-center flex-1">
                <div
                  className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-sm sm:text-base font-semibold transition-all duration-300 ${
                    step > num
                      ? "bg-green-500 text-white shadow-lg"
                      : step === num
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg ring-4 ring-blue-200"
                      : "bg-gray-200 text-gray-400"
                  }`}
                >
                  {step > num ? (
                    <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
                  ) : (
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </div>
                <span
                  className={`text-xs mt-2 text-center font-medium ${
                    step >= num ? "text-blue-600" : "text-gray-400"
                  }`}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (step < totalSteps) {
                handleNext();
              } else {
                handleSubmit(onSubmit)();
              }
            }}
          >
            {/* Step 1: School Information */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div>
                  <label htmlFor="schoolName" className="block text-sm font-medium mb-2">
                    School Name *
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="schoolName"
                      {...register("schoolName")}
                      placeholder="Wesley International School"
                      disabled={isLoading}
                      className="pl-10 text-sm sm:text-base"
                    />
                  </div>
                  {errors.schoolName && (
                    <p className="text-sm text-red-500 mt-1">{errors.schoolName.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    A unique school code will be automatically generated
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="schoolEmail" className="block text-sm font-medium mb-2">
                      School Email (Optional)
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="schoolEmail"
                        type="email"
                        {...register("schoolEmail")}
                        placeholder="info@school.com"
                        className="pl-10 text-sm sm:text-base"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="schoolPhone" className="block text-sm font-medium mb-2">
                      School Phone (Optional)
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="schoolPhone"
                        type="tel"
                        {...register("schoolPhone")}
                        placeholder="+233 XX XXX XXXX"
                        className="pl-10 text-sm sm:text-base"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Admin Information */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium mb-2">
                      First Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="firstName"
                        {...register("firstName")}
                        placeholder="John"
                        className="pl-10 text-sm sm:text-base"
                      />
                    </div>
                    {errors.firstName && (
                      <p className="text-sm text-red-500 mt-1">{errors.firstName.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium mb-2">
                      Last Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="lastName"
                        {...register("lastName")}
                        placeholder="Doe"
                        className="pl-10 text-sm sm:text-base"
                      />
                    </div>
                    {errors.lastName && (
                      <p className="text-sm text-red-500 mt-1">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      {...register("email")}
                      placeholder="admin@school.com"
                      className="pl-10 text-sm sm:text-base"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium mb-2">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      {...register("phone")}
                      placeholder="+233 XX XXX XXXX"
                      className="pl-10 text-sm sm:text-base"
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="gender" className="block text-sm font-medium mb-2">
                      Gender *
                    </label>
                    <Select
                      value={formValues.gender}
                      onValueChange={(value: "MALE" | "FEMALE") => setValue("gender", value)}
                    >
                      <SelectTrigger className="text-sm sm:text-base">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label htmlFor="dob" className="block text-sm font-medium mb-2">
                      Date of Birth *
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="dob"
                        type="date"
                        {...register("dob")}
                        className="pl-10 text-sm sm:text-base"
                        max={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                    {errors.dob && (
                      <p className="text-sm text-red-500 mt-1">{errors.dob.message}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Security */}
            {step === 3 && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      {...register("password")}
                      placeholder="••••••••"
                      className="pl-10 text-sm sm:text-base"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    8+ chars, uppercase, lowercase, number & special character
                  </p>
                  {errors.password && (
                    <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      {...register("confirmPassword")}
                      placeholder="••••••••"
                      className="pl-10 text-sm sm:text-base"
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-red-500 mt-1">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <Alert className="bg-blue-50 border-blue-200">
                  <AlertDescription className="text-xs sm:text-sm text-blue-800">
                    <strong>Important:</strong> This account will have full
                    administrative access. Keep credentials secure and
                    don&apos;t share with unauthorized persons.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-3 mt-6">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={isLoading}
                  className="flex-1 text-sm sm:text-base"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              )}
              <Button
                type="submit"
                disabled={isLoading || !canProceedToNextStep}
                className={`text-sm sm:text-base ${
                  step === 1 ? "w-full" : "flex-1"
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : step < totalSteps ? (
                  "Continue"
                ) : (
                  "Complete Setup"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}