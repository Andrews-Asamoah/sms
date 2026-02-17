// components/school/students/add-guardian-dialog.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { UserPlus, Loader2, Mail, Phone as PhoneIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { toast } from "sonner";

const guardianSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  otherNames: z.string().optional().nullable(),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
  alternatePhone: z.string().optional().nullable(),
  relationshipType: z.enum([
    "FATHER",
    "MOTHER",
    "GUARDIAN",
    "SIBLING",
    "RELATIVE",
    "OTHER",
  ]),
  occupation: z.string().optional().nullable(),
  employer: z.string().optional().nullable(),
  workPhone: z.string().optional().nullable(),
  workAddress: z.string().optional().nullable(),
  isPrimary: z.boolean(),
  canPickup: z.boolean(),
  receiveReports: z.boolean(),
  receiveAlerts: z.boolean(),
});

type GuardianFormData = z.infer<typeof guardianSchema>;

interface AddGuardianDialogProps {
  studentId: string;
  studentName: string;
  schoolId: string;
  schoolSlug: string;
  organizationId: string;
}

export function AddGuardianDialog({
  studentId,
  studentName,
  schoolId,
  schoolSlug,
  organizationId,
}: AddGuardianDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<GuardianFormData>({
    resolver: zodResolver(guardianSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      otherNames: null,
      email: "",
      phone: "",
      alternatePhone: null,
      relationshipType: "MOTHER",
      occupation: null,
      employer: null,
      workPhone: null,
      workAddress: null,
      isPrimary: false,
      canPickup: true,
      receiveReports: true,
      receiveAlerts: true,
    },
  });

  async function onSubmit(data: GuardianFormData) {
    try {
      setIsSubmitting(true);

      const response = await fetch(
        `/api/schools/${schoolSlug}/students/${studentId}/guardians`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...data,
            studentId,
            schoolId,
            organizationId,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to add guardian");
      }

      toast.success("Guardian Added", {
        description: result.message || "Guardian added successfully",
      });

      reset();
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error adding guardian:", error);
      toast.error("Error", {
        description:
          error instanceof Error ? error.message : "Failed to add guardian",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Guardian
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Guardian</DialogTitle>
          <DialogDescription>
            Add a parent or guardian for {studentName}. An invitation will be
            sent if they do not have an account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Personal Information</h3>

            <div className="grid grid-cols-2 gap-4">
              <FieldGroup>
                <FieldLabel htmlFor="firstName">First Name *</FieldLabel>
                <Input
                  id="firstName"
                  placeholder="John"
                  {...register("firstName")}
                />
                {errors.firstName && (
                  <FieldError>{errors.firstName.message}</FieldError>
                )}
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="lastName">Last Name *</FieldLabel>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  {...register("lastName")}
                />
                {errors.lastName && (
                  <FieldError>{errors.lastName.message}</FieldError>
                )}
              </FieldGroup>
            </div>

            <FieldGroup>
              <FieldLabel htmlFor="otherNames">Other Names</FieldLabel>
              <Input
                id="otherNames"
                placeholder="Middle name"
                {...register("otherNames")}
              />
            </FieldGroup>

            <FieldGroup>
              <FieldLabel htmlFor="relationshipType">Relationship *</FieldLabel>
              <Select
                value={watch("relationshipType")}
                onValueChange={(value) =>
                  setValue(
                    "relationshipType",
                    value as
                      | "FATHER"
                      | "MOTHER"
                      | "GUARDIAN"
                      | "SIBLING"
                      | "RELATIVE"
                      | "OTHER",
                  )
                }
              >
                <SelectTrigger id="relationshipType">
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FATHER">Father</SelectItem>
                  <SelectItem value="MOTHER">Mother</SelectItem>
                  <SelectItem value="GUARDIAN">Guardian</SelectItem>
                  <SelectItem value="SIBLING">Sibling</SelectItem>
                  <SelectItem value="RELATIVE">Relative</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.relationshipType && (
                <FieldError>{errors.relationshipType.message}</FieldError>
              )}
            </FieldGroup>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Contact Information</h3>

            <FieldGroup>
              <FieldLabel htmlFor="email">
                <Mail className="inline h-4 w-4 mr-1" />
                Email *
              </FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="john.doe@example.com"
                {...register("email")}
              />
              <p className="text-sm text-muted-foreground">
                An invitation will be sent if this email does not have an
                account
              </p>
              {errors.email && <FieldError>{errors.email.message}</FieldError>}
            </FieldGroup>

            <div className="grid grid-cols-2 gap-4">
              <FieldGroup>
                <FieldLabel htmlFor="phone">
                  <PhoneIcon className="inline h-4 w-4 mr-1" />
                  Phone *
                </FieldLabel>
                <Input
                  id="phone"
                  placeholder="+233244123456"
                  {...register("phone")}
                />
                {errors.phone && (
                  <FieldError>{errors.phone.message}</FieldError>
                )}
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="alternatePhone">
                  Alternate Phone
                </FieldLabel>
                <Input
                  id="alternatePhone"
                  placeholder="+233201234567"
                  {...register("alternatePhone")}
                />
              </FieldGroup>
            </div>
          </div>

          {/* Work Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">
              Work Information (Optional)
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <FieldGroup>
                <FieldLabel htmlFor="occupation">Occupation</FieldLabel>
                <Input
                  id="occupation"
                  placeholder="Software Engineer"
                  {...register("occupation")}
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="employer">Employer</FieldLabel>
                <Input
                  id="employer"
                  placeholder="Company Name"
                  {...register("employer")}
                />
              </FieldGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FieldGroup>
                <FieldLabel htmlFor="workPhone">Work Phone</FieldLabel>
                <Input
                  id="workPhone"
                  placeholder="+233302123456"
                  {...register("workPhone")}
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="workAddress">Work Address</FieldLabel>
                <Textarea
                  id="workAddress"
                  placeholder="123 Business St"
                  {...register("workAddress")}
                />
              </FieldGroup>
            </div>
          </div>

          {/* Permissions */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Permissions</h3>

            <div className="space-y-3">
              <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <Checkbox
                  id="isPrimary"
                  checked={watch("isPrimary")}
                  onCheckedChange={(checked) =>
                    setValue("isPrimary", checked as boolean)
                  }
                />
                <div className="space-y-1 leading-none">
                  <label
                    htmlFor="isPrimary"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Primary Guardian
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Set as the primary contact for this student
                  </p>
                </div>
              </div>

              <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <Checkbox
                  id="canPickup"
                  checked={watch("canPickup")}
                  onCheckedChange={(checked) =>
                    setValue("canPickup", checked as boolean)
                  }
                />
                <div className="space-y-1 leading-none">
                  <label
                    htmlFor="canPickup"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Can Pickup Student
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Authorized to pick up the student from school
                  </p>
                </div>
              </div>

              <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <Checkbox
                  id="receiveReports"
                  checked={watch("receiveReports")}
                  onCheckedChange={(checked) =>
                    setValue("receiveReports", checked as boolean)
                  }
                />
                <div className="space-y-1 leading-none">
                  <label
                    htmlFor="receiveReports"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Receive Reports
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Receive academic reports and progress updates
                  </p>
                </div>
              </div>

              <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <Checkbox
                  id="receiveAlerts"
                  checked={watch("receiveAlerts")}
                  onCheckedChange={(checked) =>
                    setValue("receiveAlerts", checked as boolean)
                  }
                />
                <div className="space-y-1 leading-none">
                  <label
                    htmlFor="receiveAlerts"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Receive Alerts
                  </label>
                  <p className="text-sm text-muted-foreground">
                    Receive alerts about attendance, behavior, etc.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Add Guardian
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
