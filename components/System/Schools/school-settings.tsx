"use client";

import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, MapPin } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(3, "School name must be at least 3 characters"),
  code: z.string().min(2, "School code must be at least 2 characters").max(10),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  motto: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  currency: z.string(),
  timezone: z.string(),
  locale: z.string(),
  primaryColor: z.string(),
  secondaryColor: z.string(),
  isActive: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface School {
  id: string;
  name: string;
  code: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  motto: string | null;
  website: string | null;
  currency: string;
  timezone: string;
  locale: string;
  primaryColor: string;
  secondaryColor: string;
  isActive: boolean;
}

interface SchoolSettingsProps {
  school: School; // ✅ Properly typed
}

export function SchoolSettings({ school }: SchoolSettingsProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: school.name,
      code: school.code,
      email: school.email || "",
      phone: school.phone || "",
      address: school.address || "",
      motto: school.motto || "",
      website: school.website || "",
      currency: school.currency,
      timezone: school.timezone,
      locale: school.locale,
      primaryColor: school.primaryColor,
      secondaryColor: school.secondaryColor,
      isActive: school.isActive,
    },
  });

  const currency = watch("currency");
  const timezone = watch("timezone");
  const locale = watch("locale");
  const primaryColor = watch("primaryColor");
  const secondaryColor = watch("secondaryColor");
  const isActive = watch("isActive");

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/schools/${school.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update school");
      }

      toast.success("School updated successfully", {
        description: "Your changes have been saved.",
      });

      router.refresh();
    } catch (error) {
      toast.error("Error updating school", {
        description:
          error instanceof Error ? error.message : "Failed to update school",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <FieldGroup>
        {/* Basic Information */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium">Basic Information</h3>
            <p className="text-sm text-muted-foreground">
              Update your school&apos;s basic information
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="name">School Name</FieldLabel>
              <Input
                {...register("name")}
                id="name"
                className="pl-10"
                disabled={isSubmitting}
                aria-invalid={!!errors.name}
              />
              <FieldError errors={[errors.name]} />
            </Field>

            <Field data-invalid={!!errors.code}>
              <FieldLabel htmlFor="code">School Code</FieldLabel>
              <Input
                {...register("code")}
                id="code"
                className="pl-10"
                disabled
                aria-invalid={!!errors.code}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Cannot be changed
              </p>
              <FieldError errors={[errors.code]} />
            </Field>

            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                {...register("email")}
                id="email"
                type="email"
                className="pl-10"
                disabled={isSubmitting}
                aria-invalid={!!errors.email}
              />
              <FieldError errors={[errors.email]} />
            </Field>

            <Field data-invalid={!!errors.phone}>
              <FieldLabel htmlFor="phone">Phone</FieldLabel>
              <Input
                {...register("phone")}
                id="phone"
                className="pl-10"
                disabled={isSubmitting}
                aria-invalid={!!errors.phone}
              />
              <FieldError errors={[errors.phone]} />
            </Field>

            <Field data-invalid={!!errors.website}>
              <FieldLabel htmlFor="website">Website</FieldLabel>
              <Input
                {...register("website")}
                id="website"
                type="url"
                className="pl-10"
                disabled={isSubmitting}
                aria-invalid={!!errors.website}
              />
              <FieldError errors={[errors.website]} />
            </Field>
          </div>

          <Field data-invalid={!!errors.address}>
            <FieldLabel htmlFor="address">Address</FieldLabel>
            <div className="relative">
              <Textarea
                {...register("address")}
                id="address"
                className="resize-none min-h-25"
                disabled={isSubmitting}
                aria-invalid={!!errors.address}
              />
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            </div>
            <FieldError errors={[errors.address]} />
          </Field>

          <Field data-invalid={!!errors.motto}>
            <FieldLabel htmlFor="motto">Motto</FieldLabel>
            <Input
              {...register("motto")}
              id="motto"
              className="pl-10"
              disabled={isSubmitting}
              aria-invalid={!!errors.motto}
            />
            <FieldError errors={[errors.motto]} />
          </Field>
        </div>

        {/* Configuration */}
        <div className="space-y-6 border-t pt-6">
          <div>
            <h3 className="text-lg font-medium">Configuration</h3>
            <p className="text-sm text-muted-foreground">
              Regional and system settings
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Field data-invalid={!!errors.currency}>
              <FieldLabel htmlFor="currency">Currency</FieldLabel>
              <Select
                value={currency}
                onValueChange={(value) => setValue("currency", value)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GHS">GHS - Ghana Cedi</SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                </SelectContent>
              </Select>
              <FieldError errors={[errors.currency]} />
            </Field>

            <Field data-invalid={!!errors.timezone}>
              <FieldLabel htmlFor="timezone">Timezone</FieldLabel>
              <Select
                value={timezone}
                onValueChange={(value) => setValue("timezone", value)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="timezone">
                  <SelectValue />
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
                </SelectContent>
              </Select>
              <FieldError errors={[errors.timezone]} />
            </Field>

            <Field data-invalid={!!errors.locale}>
              <FieldLabel htmlFor="locale">Locale</FieldLabel>
              <Select
                value={locale}
                onValueChange={(value) => setValue("locale", value)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="locale">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-GH">English (Ghana)</SelectItem>
                  <SelectItem value="en-NG">English (Nigeria)</SelectItem>
                  <SelectItem value="en-KE">English (Kenya)</SelectItem>
                  <SelectItem value="en-US">English (US)</SelectItem>
                </SelectContent>
              </Select>
              <FieldError errors={[errors.locale]} />
            </Field>
          </div>
        </div>

        {/* Branding */}
        <div className="space-y-6 border-t pt-6">
          <div>
            <h3 className="text-lg font-medium">Branding</h3>
            <p className="text-sm text-muted-foreground">
              Customize colors and appearance
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Field data-invalid={!!errors.primaryColor}>
              <FieldLabel htmlFor="primaryColor">Primary Color</FieldLabel>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setValue("primaryColor", e.target.value)}
                  className="w-20 h-10 p-1 cursor-pointer"
                  disabled={isSubmitting}
                />
                <Input
                  {...register("primaryColor")}
                  id="primaryColor"
                  placeholder="#3B82F6"
                  className="flex-1"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.primaryColor}
                />
              </div>
              <FieldError errors={[errors.primaryColor]} />
            </Field>

            <Field data-invalid={!!errors.secondaryColor}>
              <FieldLabel htmlFor="secondaryColor">Secondary Color</FieldLabel>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setValue("secondaryColor", e.target.value)}
                  className="w-20 h-10 p-1 cursor-pointer"
                  disabled={isSubmitting}
                />
                <Input
                  {...register("secondaryColor")}
                  id="secondaryColor"
                  placeholder="#10B981"
                  className="flex-1"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.secondaryColor}
                />
              </div>
              <FieldError errors={[errors.secondaryColor]} />
            </Field>
          </div>
        </div>

        {/* Status */}
        <div className="space-y-6 border-t pt-6">
          <Field
            orientation="horizontal"
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <div className="space-y-0.5">
              <FieldLabel htmlFor="isActive" className="text-base">
                School Status
              </FieldLabel>
              <p className="text-sm text-muted-foreground">
                Activate or deactivate this school
              </p>
            </div>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={(checked) => setValue("isActive", checked)}
              disabled={isSubmitting}
            />
          </Field>
        </div>
      </FieldGroup>

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => reset()}
          disabled={isSubmitting}
        >
          Reset
        </Button>
      </div>
    </form>
  );
}
