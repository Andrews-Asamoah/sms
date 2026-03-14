// components/settings/school-info-form.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { updateSchoolBasicInfo } from "@/actions/school-data";
import { useState } from "react";

const formSchema = z.object({
  name: z.string().min(2, "School name must be at least 2 characters"),
  motto: z.string().optional().nullable(),
  email: z.string().email("Invalid email address").optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  website: z
    .string()
    .url("Invalid website URL")
    .or(z.literal(""))
    .optional()
    .nullable(),
});

type FormValues = z.infer<typeof formSchema>;

interface SchoolInfoFormProps {
  school: {
    id: string;
    name: string;
    motto: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    website: string | null;
  };
}

export function SchoolInfoForm({ school }: SchoolInfoFormProps) {
  const [isPending, setIsPending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: school.name,
      motto: school.motto || "",
      email: school.email || "",
      phone: school.phone || "",
      address: school.address || "",
      website: school.website || "",
    },
  });

  async function onSubmit(values: FormValues) {
    setIsPending(true);
    try {
      const result = await updateSchoolBasicInfo(school.id, values);
      if (result.success) {
        toast.success("School information updated successfully");
      } else {
        toast.error(result.error || "Failed to update school information");
      }
    } catch (error) {
      toast.error("An error occurred while updating the information");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FieldGroup>
        <div className="grid gap-6 md:grid-cols-2">
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="name">School Name</FieldLabel>
            <Input
              id="name"
              placeholder="Enter school name"
              {...register("name")}
            />
            <FieldError errors={[errors.name]} />
          </Field>

          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email">Contact Email</FieldLabel>
            <Input
              id="email"
              placeholder="school@example.com"
              {...register("email")}
            />
            <FieldError errors={[errors.email]} />
          </Field>

          <Field data-invalid={!!errors.phone}>
            <FieldLabel htmlFor="phone">Contact Phone</FieldLabel>
            <Input
              id="phone"
              placeholder="+1234567890"
              {...register("phone")}
            />
            <FieldError errors={[errors.phone]} />
          </Field>

          <Field data-invalid={!!errors.website}>
            <FieldLabel htmlFor="website">Website</FieldLabel>
            <Input
              id="website"
              placeholder="https://www.school.edu"
              {...register("website")}
            />
            <FieldError errors={[errors.website]} />
          </Field>
        </div>

        <Field data-invalid={!!errors.motto}>
          <FieldLabel htmlFor="motto">School Motto</FieldLabel>
          <Input
            id="motto"
            placeholder="Education for All"
            {...register("motto")}
          />
          <p className="text-sm text-muted-foreground mt-1 text-xs">
            A short catchy phrase for your school.
          </p>
          <FieldError errors={[errors.motto]} />
        </Field>

        <Field data-invalid={!!errors.address}>
          <FieldLabel htmlFor="address">Physical Address</FieldLabel>
          <Textarea
            id="address"
            placeholder="123 School Street, City, Country"
            {...register("address")}
          />
          <FieldError errors={[errors.address]} />
        </Field>
      </FieldGroup>

      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          disabled={isPending}
          className="px-8 transition-all hover:scale-105 active:scale-95 icon-glow"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
