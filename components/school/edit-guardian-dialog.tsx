"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Edit, Pencil } from "lucide-react";
import { type GuardianData } from "./parents-table";

const editGuardianSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Valid email is required").optional().or(z.literal("")),
  phone: z.string().min(8, "Valid phone number is required"),
  alternatePhone: z.string().optional(),
  occupation: z.string().optional(),
  relationshipType: z.enum([
    "FATHER",
    "MOTHER",
    "GUARDIAN",
    "SIBLING",
    "RELATIVE",
    "OTHER",
  ]),
  isActive: z.boolean(),
});

type EditGuardianFormValues = z.infer<typeof editGuardianSchema>;

interface EditGuardianDialogProps {
  schoolSlug: string;
  guardian: GuardianData;
  trigger?: React.ReactNode;
}

export function EditGuardianDialog({
  schoolSlug,
  guardian,
  trigger,
}: EditGuardianDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Split full name if needed
  const nameParts = guardian.name.split(" ");
  const defaultFirstName = nameParts[0] || "";
  const defaultLastName = nameParts.slice(1).join(" ") || "";

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<EditGuardianFormValues>({
    resolver: zodResolver(editGuardianSchema),
    defaultValues: {
      firstName: defaultFirstName,
      lastName: defaultLastName,
      email: guardian.email || "",
      phone: guardian.phone || "",
      alternatePhone: guardian.altPhone || "",
      occupation: guardian.occupation || "",
      relationshipType: "GUARDIAN",
      isActive: guardian.isActive,
    },
  });

  // Re-sync form default values when guardian prop changes or dialog opens
  useEffect(() => {
    if (isOpen) {
      const parts = guardian.name.split(" ");
      reset({
        firstName: parts[0] || "",
        lastName: parts.slice(1).join(" ") || "",
        email: guardian.email || "",
        phone: guardian.phone || "",
        alternatePhone: guardian.altPhone || "",
        occupation: guardian.occupation || "",
        relationshipType: "GUARDIAN",
        isActive: guardian.isActive,
      });
    }
  }, [isOpen, guardian, reset]);

  const relationshipType = watch("relationshipType");
  const isActive = watch("isActive");

  const onSubmit: SubmitHandler<EditGuardianFormValues> = async (data) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/schools/${schoolSlug}/guardians/${guardian.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update guardian");
      }

      toast.success("Guardian updated successfully", {
        description: `Information for ${data.firstName} ${data.lastName} has been updated.`,
      });

      setIsOpen(false);
      router.refresh();
    } catch (error) {
      toast.error("Failed to update guardian", {
        description:
          error instanceof Error ? error.message : "An error occurred while saving.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Edit className="h-5 w-5 text-blue-500" />
            Edit Guardian Information
          </DialogTitle>
          <DialogDescription>
            Update contact details, relationship, and active status for{" "}
            <span className="font-semibold text-foreground">{guardian.name}</span> (
            <code className="font-mono text-xs">{guardian.guardianId}</code>).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <FieldGroup className="space-y-3">
            {/* First & Last Name */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field data-invalid={!!errors.firstName}>
                <FieldLabel htmlFor="edit-first-name">First Name</FieldLabel>
                <Input
                  id="edit-first-name"
                  placeholder="First Name"
                  {...register("firstName")}
                />
                <FieldError errors={[errors.firstName]} />
              </Field>

              <Field data-invalid={!!errors.lastName}>
                <FieldLabel htmlFor="edit-last-name">Last Name</FieldLabel>
                <Input
                  id="edit-last-name"
                  placeholder="Last Name"
                  {...register("lastName")}
                />
                <FieldError errors={[errors.lastName]} />
              </Field>
            </div>

            {/* Email Address */}
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="edit-email">Email Address</FieldLabel>
              <Input
                id="edit-email"
                type="email"
                placeholder="parent@example.com"
                {...register("email")}
              />
              <FieldError errors={[errors.email]} />
            </Field>

            {/* Primary & Alternate Phone */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field data-invalid={!!errors.phone}>
                <FieldLabel htmlFor="edit-phone">Primary Phone</FieldLabel>
                <Input
                  id="edit-phone"
                  placeholder="e.g. 024XXXXXXX"
                  {...register("phone")}
                />
                <FieldError errors={[errors.phone]} />
              </Field>

              <Field data-invalid={!!errors.alternatePhone}>
                <FieldLabel htmlFor="edit-alt-phone">Alt Phone (Optional)</FieldLabel>
                <Input
                  id="edit-alt-phone"
                  placeholder="e.g. 020XXXXXXX"
                  {...register("alternatePhone")}
                />
                <FieldError errors={[errors.alternatePhone]} />
              </Field>
            </div>

            {/* Occupation & Relationship */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field data-invalid={!!errors.occupation}>
                <FieldLabel htmlFor="edit-occupation">Occupation</FieldLabel>
                <Input
                  id="edit-occupation"
                  placeholder="e.g. Engineer"
                  {...register("occupation")}
                />
                <FieldError errors={[errors.occupation]} />
              </Field>

              <Field data-invalid={!!errors.relationshipType}>
                <FieldLabel htmlFor="edit-relationship">Relationship</FieldLabel>
                <Select
                  onValueChange={(val) =>
                    setValue("relationshipType", val as any, { shouldValidate: true })
                  }
                  value={relationshipType}
                >
                  <SelectTrigger id="edit-relationship">
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FATHER">Father</SelectItem>
                    <SelectItem value="MOTHER">Mother</SelectItem>
                    <SelectItem value="GUARDIAN">Legal Guardian</SelectItem>
                    <SelectItem value="SIBLING">Sibling</SelectItem>
                    <SelectItem value="RELATIVE">Relative</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError errors={[errors.relationshipType]} />
              </Field>
            </div>

            {/* Active Account Status */}
            <Field orientation="horizontal" className="items-center space-x-3 pt-2">
              <Checkbox
                id="edit-is-active"
                checked={isActive}
                onCheckedChange={(val) => setValue("isActive", !!val)}
              />
              <div className="space-y-0.5">
                <FieldLabel htmlFor="edit-is-active" className="cursor-pointer">
                  Active Account
                </FieldLabel>
                <p className="text-xs text-muted-foreground">
                  Inactive guardians will be hidden from messaging and portal access.
                </p>
              </div>
            </Field>
          </FieldGroup>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-2">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
