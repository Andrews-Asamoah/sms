// components/forms/edit-school-form.tsx
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
import { toast } from "sonner";
import { Loader2, MapPin } from "lucide-react";
import { Prisma } from "@prisma/client";

const formSchema = z.object({
  name: z.string().min(3, "School name must be at least 3 characters"),
  code: z.string().min(2, "School code must be at least 2 characters").max(10),
  subdomain: z
    .string()
    .min(3, "Subdomain must be at least 3 characters")
    .max(20)
    .regex(
      /^[a-z0-9-]+$/,
      "Only lowercase letters, numbers, and hyphens allowed",
    ),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  motto: z.string().optional(),
  website: z.string().optional(),
  currency: z.string(),
  timezone: z.string(),
  locale: z.string(),
});

type FormData = z.infer<typeof formSchema>;

type SchoolData = Prisma.SchoolGetPayload<{
  include: {
    subscription: true;
    organization: true;
  };
}>;

interface EditSchoolFormProps {
  school: SchoolData;
}

export function EditSchoolForm({ school }: EditSchoolFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, dirtyFields },
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: school.name,
      code: school.code,
      subdomain: school.subdomain,
      email: school.email || "",
      phone: school.phone || "",
      address: school.address || "",
      motto: school.motto || "",
      website: school.website || "",
      currency: school.currency,
      timezone: school.timezone,
      locale: school.locale,
    },
  });

  const currency = watch("currency");
  const timezone = watch("timezone");
  const locale = watch("locale");

  async function onSubmit(data: FormData) {
    setIsSubmitting(true);
    try {
      // Only send changed fields
      const changedData: Partial<FormData> = {};

      (Object.keys(dirtyFields) as Array<keyof FormData>).forEach((key) => {
        changedData[key] = data[key];
      });

      // If nothing changed, don't send request
      if (Object.keys(changedData).length === 0) {
        toast.info("No changes detected", {
          description: "No fields were modified.",
        });
        setIsSubmitting(false);
        return;
      }

      const response = await fetch(`/api/schools/${school.subdomain}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changedData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update school");
      }

      toast.success("School updated successfully", {
        description: `${Object.keys(changedData).length} field(s) updated.`,
      });

      router.refresh();
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Error updating school", {
        description:
          error instanceof Error ? error.message : "Failed to update school",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FieldGroup>
        <div className="grid gap-6 md:grid-cols-2">
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="name">School Name *</FieldLabel>
            <Input
              {...register("name")}
              id="name"
              placeholder="Accra High School"
              disabled={isSubmitting}
              aria-invalid={!!errors.name}
            />
            <FieldError errors={[errors.name]} />
          </Field>

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
                const upperValue = e.target.value.toUpperCase();
                setValue("code", upperValue, { shouldDirty: true });
              }}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Unique identifier for the school
            </p>
            <FieldError errors={[errors.code]} />
          </Field>

          <Field data-invalid={!!errors.subdomain}>
            <FieldLabel htmlFor="subdomain">Subdomain *</FieldLabel>
            <div className="relative">
              <Input
                {...register("subdomain")}
                id="subdomain"
                placeholder="accra-high"
                className="pr-32 lowercase"
                disabled={isSubmitting}
                aria-invalid={!!errors.subdomain}
                onChange={(e) => {
                  const lowerValue = e.target.value.toLowerCase();
                  setValue("subdomain", lowerValue, { shouldDirty: true });
                }}
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                .yourdomain.com
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              URL for accessing the school
            </p>
            <FieldError errors={[errors.subdomain]} />
          </Field>

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

          <Field data-invalid={!!errors.website}>
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

        <Field data-invalid={!!errors.address}>
          <FieldLabel htmlFor="address">Address</FieldLabel>
          <div className="relative">
            <Textarea
              {...register("address")}
              id="address"
              placeholder="Enter school address"
              className="resize-none min-h-25 pl-10"
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
            placeholder="Excellence in Education"
            disabled={isSubmitting}
            aria-invalid={!!errors.motto}
          />
          <FieldError errors={[errors.motto]} />
        </Field>

        <div className="grid gap-6 md:grid-cols-3">
          <Field data-invalid={!!errors.currency}>
            <FieldLabel htmlFor="currency">Currency</FieldLabel>
            <Select
              value={currency}
              onValueChange={(value) =>
                setValue("currency", value, { shouldDirty: true })
              }
              disabled={isSubmitting}
            >
              <SelectTrigger id="currency">
                <SelectValue placeholder="Select currency" />
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
              onValueChange={(value) =>
                setValue("timezone", value, { shouldDirty: true })
              }
              disabled={isSubmitting}
            >
              <SelectTrigger id="timezone">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Africa/Accra">Africa/Accra (GMT)</SelectItem>
                <SelectItem value="Africa/Lagos">Africa/Lagos (WAT)</SelectItem>
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
              onValueChange={(value) =>
                setValue("locale", value, { shouldDirty: true })
              }
              disabled={isSubmitting}
            >
              <SelectTrigger id="locale">
                <SelectValue placeholder="Select locale" />
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
      </FieldGroup>

      <div className="flex gap-4 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            "Update School"
          )}
        </Button>
      </div>
    </form>
  );
}
