"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, MapPin, CheckCircle2, XCircle, ImagePlus, Upload, X } from "lucide-react";
import { updateSchoolLogo } from "@/actions/school-logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const formSchema = z.object({
  name: z
    .string()
    .min(3, "School name must be at least 3 characters")
    .max(100, "School name must not exceed 100 characters"),
  code: z
    .string()
    .min(2, "School code must be at least 2 characters")
    .max(10, "School code must not exceed 10 characters")
    .regex(/^[A-Z0-9]+$/, "Only uppercase letters and numbers allowed"),
  subdomain: z
    .string()
    .min(3, "Subdomain must be at least 3 characters")
    .max(20, "Subdomain must not exceed 20 characters")
    .regex(
      /^[a-z0-9-]+$/,
      "Only lowercase letters, numbers, and hyphens allowed",
    )
    .refine((val) => !val.startsWith("-") && !val.endsWith("-"), {
      message: "Subdomain cannot start or end with a hyphen",
    }),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().max(500, "Address too long").optional(),
  motto: z.string().max(200, "Motto too long").optional(),
  website: z
    .string()
    .url("Invalid URL (must start with http:// or https://)")
    .optional()
    .or(z.literal("")),
  currency: z.string(),
  timezone: z.string(),
  locale: z.string(),
});

type FormData = z.infer<typeof formSchema>;

interface AvailabilityCheck {
  isChecking: boolean;
  isAvailable: boolean | null;
  message: string;
}

export function CreateSchoolForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [codeAvailability, setCodeAvailability] = useState<AvailabilityCheck>({
    isChecking: false,
    isAvailable: null,
    message: "",
  });
  const [subdomainAvailability, setSubdomainAvailability] =
    useState<AvailabilityCheck>({
      isChecking: false,
      isAvailable: null,
      message: "",
    });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      code: "",
      subdomain: "",
      email: "",
      phone: "",
      address: "",
      motto: "",
      website: "",
      currency: "GHS",
      timezone: "Africa/Accra",
      locale: "en-GH",
    },
  });

  const currency = watch("currency");
  const timezone = watch("timezone");
  const locale = watch("locale");
  const code = watch("code");
  const subdomain = watch("subdomain");

  // Auto-generate subdomain and code from school name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;

    // Generate subdomain
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 20);
    setValue("subdomain", slug);

    // Generate code (first letters of each word, max 10 chars)
    const codeGen = name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .substring(0, 10);
    setValue("code", codeGen);
  };

  // Check code availability with debounce
  useEffect(() => {
    if (!code || code.length < 2) {
      setCodeAvailability({
        isChecking: false,
        isAvailable: null,
        message: "",
      });
      return;
    }

    const timeoutId = setTimeout(async () => {
      setCodeAvailability({ isChecking: true, isAvailable: null, message: "" });

      try {
        const response = await fetch(
          `/api/schools/check-availability?code=${encodeURIComponent(code)}`,
        );
        const data = await response.json();

        setCodeAvailability({
          isChecking: false,
          isAvailable: data.available,
          message: data.available ? "Code is available" : data.message,
        });
      } catch {
        setCodeAvailability({
          isChecking: false,
          isAvailable: null,
          message: "Could not check availability",
        });
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [code]);

  // Check subdomain availability with debounce
  useEffect(() => {
    if (!subdomain || subdomain.length < 3) {
      setSubdomainAvailability({
        isChecking: false,
        isAvailable: null,
        message: "",
      });
      return;
    }

    const timeoutId = setTimeout(async () => {
      setSubdomainAvailability({
        isChecking: true,
        isAvailable: null,
        message: "",
      });

      try {
        const response = await fetch(
          `/api/schools/check-availability?subdomain=${encodeURIComponent(subdomain)}`,
        );
        const data = await response.json();

        setSubdomainAvailability({
          isChecking: false,
          isAvailable: data.available,
          message: data.available ? "Subdomain is available" : data.message,
        });
      } catch {
        setSubdomainAvailability({
          isChecking: false,
          isAvailable: null,
          message: "Could not check availability",
        });
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [subdomain]);

  async function onSubmit(data: FormData) {
    // Prevent double submission
    if (isSubmitting) return;

    // Final check before submission
    if (codeAvailability.isAvailable === false) {
      toast.error("School code is not available", {
        description: "Please choose a different code",
      });
      return;
    }

    if (subdomainAvailability.isAvailable === false) {
      toast.error("Subdomain is not available", {
        description: "Please choose a different subdomain",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create school");
      }

      toast.success("School created successfully! 🎉", {
        description: `${data.name} has been created with subdomain: ${data.subdomain}`,
        duration: 5000,
      });

      // 2. Upload Logo if selected
      if (logoFile) {
        const logoFormData = new FormData();
        logoFormData.append("file", logoFile);
        
        try {
          const logoResult = await updateSchoolLogo(result.data.id, logoFormData);
          if (!logoResult.success) {
            toast.error("School created, but logo upload failed", {
              description: logoResult.error
            });
          }
        } catch (logoError) {
          console.error("Error uploading logo during creation:", logoError);
          toast.error("School created, but logo upload failed");
        }
      }

      // 3. Redirect to the school dashboard
      router.push(`/schools/${result.data.subdomain}`);
      router.refresh();
    } catch (error) {
      console.error("Error creating school:", error);
      toast.error("Failed to create school", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const AvailabilityIndicator = ({
    availability,
  }: {
    availability: AvailabilityCheck;
  }) => {
    if (availability.isChecking) {
      return (
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Checking...
        </span>
      );
    }

    if (availability.isAvailable === true) {
      return (
        <span className="flex items-center gap-1 text-sm text-green-600">
          <CheckCircle2 className="h-3 w-3" />
          {availability.message}
        </span>
      );
    }

    if (availability.isAvailable === false) {
      return (
        <span className="flex items-center gap-1 text-sm text-red-600">
          <XCircle className="h-3 w-3" />
          {availability.message}
        </span>
      );
    }

    return null;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* School Logo Section */}
      <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 transition-colors">
        <div className="relative group">
          <Avatar className="h-32 w-32 border-4 border-white dark:border-slate-800 shadow-xl transition-transform duration-300 group-hover:scale-105">
            <AvatarImage src={logoPreview || ""} />
            <AvatarFallback className="bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 text-3xl font-bold text-blue-600 dark:text-blue-300">
              {watch("name") ? watch("name").charAt(0).toUpperCase() : <ImagePlus className="h-10 w-10 text-slate-400" />}
            </AvatarFallback>
          </Avatar>
          
          <label 
            htmlFor="logo-upload" 
            className="absolute -bottom-1 -right-1 h-10 w-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center cursor-pointer shadow-lg transition-all hover:scale-110 active:scale-95 border-2 border-white dark:border-slate-800 icon-glow"
          >
            <Upload className="h-5 w-5" />
          </label>
          
          <input 
            id="logo-upload" 
            type="file" 
            className="hidden" 
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setLogoFile(file);
                const reader = new FileReader();
                reader.onloadend = () => setLogoPreview(reader.result as string);
                reader.readAsDataURL(file);
              }
            }}
          />

          {logoPreview && (
            <button
              type="button"
              onClick={() => {
                setLogoFile(null);
                setLogoPreview(null);
              }}
              className="absolute -top-1 -right-1 h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors border-2 border-white dark:border-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        <div className="mt-4 text-center">
          <h4 className="font-semibold text-slate-900 dark:text-white">School Logo</h4>
          <p className="text-xs text-muted-foreground mt-1 px-4">
            Upload a high-quality logo. Square aspect ratio recommended.
            Max 2MB (JPG, PNG, WebP).
          </p>
        </div>
      </div>

      <FieldGroup>
        <div className="grid gap-6 md:grid-cols-2">
          {/* School Name */}
          <Field data-invalid={!!errors.name} className="md:col-span-2">
            <FieldLabel htmlFor="name">School Name *</FieldLabel>
            <Input
              {...register("name")}
              id="name"
              placeholder="Accra High School"
              disabled={isSubmitting}
              aria-invalid={!!errors.name}
              onChange={(e) => {
                register("name").onChange(e);
                handleNameChange(e);
              }}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Official name of the school
            </p>
            <FieldError errors={[errors.name]} />
          </Field>

          {/* School Code */}
          <Field data-invalid={!!errors.code}>
            <FieldLabel htmlFor="code">School Code *</FieldLabel>
            <Input
              {...register("code")}
              id="code"
              placeholder="AHS"
              className="uppercase"
              disabled={isSubmitting}
              aria-invalid={!!errors.code}
              onChange={(e) => {
                const value = e.target.value.toUpperCase();
                setValue("code", value);
              }}
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-sm text-muted-foreground">
                Unique identifier (auto-generated)
              </p>
              <AvailabilityIndicator availability={codeAvailability} />
            </div>
            <FieldError errors={[errors.code]} />
          </Field>

          {/* Subdomain */}
          <Field data-invalid={!!errors.subdomain}>
            <FieldLabel htmlFor="subdomain">Subdomain *</FieldLabel>
            <div className="relative">
              <Input
                {...register("subdomain")}
                id="subdomain"
                placeholder="accra-high"
                className="pr-36 lowercase"
                disabled={isSubmitting}
                aria-invalid={!!errors.subdomain}
                onChange={(e) => {
                  const value = e.target.value.toLowerCase();
                  setValue("subdomain", value);
                }}
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                .yourdomain.com
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-sm text-muted-foreground">
                URL for school access (auto-generated)
              </p>
              <AvailabilityIndicator availability={subdomainAvailability} />
            </div>
            <FieldError errors={[errors.subdomain]} />
          </Field>

          {/* Email */}
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              {...register("email")}
              id="email"
              type="email"
              placeholder="info@school.edu.gh"
              disabled={isSubmitting}
              aria-invalid={!!errors.email}
            />
            <FieldError errors={[errors.email]} />
          </Field>

          {/* Phone */}
          <Field data-invalid={!!errors.phone}>
            <FieldLabel htmlFor="phone">Phone</FieldLabel>
            <Input
              {...register("phone")}
              id="phone"
              placeholder="+233 XX XXX XXXX"
              disabled={isSubmitting}
              aria-invalid={!!errors.phone}
            />
            <FieldError errors={[errors.phone]} />
          </Field>

          {/* Website */}
          <Field data-invalid={!!errors.website} className="md:col-span-2">
            <FieldLabel htmlFor="website">Website</FieldLabel>
            <Input
              {...register("website")}
              id="website"
              type="url"
              placeholder="https://school.edu.gh"
              disabled={isSubmitting}
              aria-invalid={!!errors.website}
            />
            <FieldError errors={[errors.website]} />
          </Field>
        </div>

        {/* Address */}
        <Field data-invalid={!!errors.address}>
          <FieldLabel htmlFor="address">Address</FieldLabel>
          <div className="relative">
            <Textarea
              {...register("address")}
              id="address"
              placeholder="Enter school physical address"
              className="resize-none min-h-24 pl-10"
              disabled={isSubmitting}
              aria-invalid={!!errors.address}
            />
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          </div>
          <FieldError errors={[errors.address]} />
        </Field>

        {/* Motto */}
        <Field data-invalid={!!errors.motto}>
          <FieldLabel htmlFor="motto">School Motto</FieldLabel>
          <Input
            {...register("motto")}
            id="motto"
            placeholder="Excellence in Education"
            disabled={isSubmitting}
            aria-invalid={!!errors.motto}
          />
          <p className="text-sm text-muted-foreground mt-1">
            Optional: Your school&apos;s motto or tagline
          </p>
          <FieldError errors={[errors.motto]} />
        </Field>

        {/* Localization Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Localization Settings</h3>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Currency */}
            <Field data-invalid={!!errors.currency}>
              <FieldLabel htmlFor="currency">Currency</FieldLabel>
              <Select
                value={currency}
                onValueChange={(value) => setValue("currency", value)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GHS">GHS - Ghana Cedi (₵)</SelectItem>
                  <SelectItem value="NGN">NGN - Nigerian Naira (₦)</SelectItem>
                  <SelectItem value="KES">
                    KES - Kenyan Shilling (KSh)
                  </SelectItem>
                  <SelectItem value="USD">USD - US Dollar ($)</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound (£)</SelectItem>
                  <SelectItem value="EUR">EUR - Euro (€)</SelectItem>
                </SelectContent>
              </Select>
              <FieldError errors={[errors.currency]} />
            </Field>

            {/* Timezone */}
            <Field data-invalid={!!errors.timezone}>
              <FieldLabel htmlFor="timezone">Timezone</FieldLabel>
              <Select
                value={timezone}
                onValueChange={(value) => setValue("timezone", value)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="timezone">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Africa/Accra">
                    Africa/Accra (GMT)
                  </SelectItem>
                  <SelectItem value="Africa/Lagos">
                    Africa/Lagos (WAT)
                  </SelectItem>
                  <SelectItem value="Africa/Nairobi">
                    Africa/Nairobi (EAT)
                  </SelectItem>
                  <SelectItem value="Africa/Johannesburg">
                    Africa/Johannesburg (SAST)
                  </SelectItem>
                  <SelectItem value="UTC">UTC</SelectItem>
                </SelectContent>
              </Select>
              <FieldError errors={[errors.timezone]} />
            </Field>

            {/* Locale */}
            <Field data-invalid={!!errors.locale}>
              <FieldLabel htmlFor="locale">Locale</FieldLabel>
              <Select
                value={locale}
                onValueChange={(value) => setValue("locale", value)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="locale">
                  <SelectValue placeholder="Select locale" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-GH">English (Ghana)</SelectItem>
                  <SelectItem value="en-NG">English (Nigeria)</SelectItem>
                  <SelectItem value="en-KE">English (Kenya)</SelectItem>
                  <SelectItem value="en-ZA">English (South Africa)</SelectItem>
                  <SelectItem value="en-US">English (US)</SelectItem>
                  <SelectItem value="en-GB">English (UK)</SelectItem>
                </SelectContent>
              </Select>
              <FieldError errors={[errors.locale]} />
            </Field>
          </div>
        </div>
      </FieldGroup>

      {/* Form Actions */}
      <div className="flex gap-4 justify-end pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={
            isSubmitting ||
            codeAvailability.isAvailable === false ||
            subdomainAvailability.isAvailable === false
          }
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating School...
            </>
          ) : (
            "Create School"
          )}
        </Button>
      </div>
    </form>
  );
}
