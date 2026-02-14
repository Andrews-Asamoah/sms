// components/schools/invite-admin-button.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, Loader2, Shield } from "lucide-react";

const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
  firstName: z
    .string()
    .min(2, "First name must be at least 2 characters")
    .optional(),
  lastName: z
    .string()
    .min(2, "Last name must be at least 2 characters")
    .optional(),
  phone: z.string().optional(),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteAdminButtonProps {
  schoolSlug: string;
  schoolName: string;
}

export function InviteAdminButton({
  schoolSlug,
  schoolName,
}: InviteAdminButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      role: "ADMIN",
      firstName: "",
      lastName: "",
      phone: "",
    },
  });

  const role = watch("role");

  async function onSubmit(data: InviteFormData) {
    setIsSubmitting(true);
    try {
      // Use schoolSlug (subdomain) instead of schoolId
      const response = await fetch(`/api/schools/${schoolSlug}/invite-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send invitation");
      }

      const result = await response.json();
      toast.success("Invitation sent!", {
        description: result.message,
      });

      setOpen(false);
      reset();
      router.refresh();
    } catch (error) {
      toast.error("Failed to send invitation", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const getRoleDescription = (selectedRole: string) => {
    switch (selectedRole) {
      case "OWNER":
        return "Full control over the school, can manage all settings and users";
      case "ADMIN":
        return "Can manage school operations, users, and most settings";
      case "MEMBER":
        return "Limited access to school resources";
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="shadow-lg">
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Administrator
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-150 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Invite School Administrator
          </DialogTitle>
          <DialogDescription>
            Send an invitation to a new administrator for {schoolName}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <FieldGroup>
            {/* Required Fields */}
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="email">Email Address *</FieldLabel>
              <Input
                {...register("email")}
                id="email"
                type="email"
                placeholder="admin@school.edu.gh"
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground mt-1">
                An invitation will be sent to this email address
              </p>
              <FieldError errors={[errors.email]} />
            </Field>

            <Field data-invalid={!!errors.role}>
              <FieldLabel htmlFor="role">Role *</FieldLabel>
              <Select
                value={role}
                onValueChange={(value) =>
                  setValue("role", value as "OWNER" | "ADMIN" | "MEMBER")
                }
                disabled={isSubmitting}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="OWNER">Owner</SelectItem>
                  <SelectItem value="MEMBER">Member</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {getRoleDescription(role)}
              </p>
              <FieldError errors={[errors.role]} />
            </Field>

            {/* Optional Profile Information */}
            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-3">
                Optional: Pre-fill Profile Information
              </p>
              <div className="grid grid-cols-2 gap-4">
                <Field data-invalid={!!errors.firstName}>
                  <FieldLabel htmlFor="firstName">First Name</FieldLabel>
                  <Input
                    {...register("firstName")}
                    id="firstName"
                    placeholder="John"
                    disabled={isSubmitting}
                  />
                  <FieldError errors={[errors.firstName]} />
                </Field>

                <Field data-invalid={!!errors.lastName}>
                  <FieldLabel htmlFor="lastName">Last Name</FieldLabel>
                  <Input
                    {...register("lastName")}
                    id="lastName"
                    placeholder="Doe"
                    disabled={isSubmitting}
                  />
                  <FieldError errors={[errors.lastName]} />
                </Field>
              </div>

              <Field data-invalid={!!errors.phone} className="mt-4">
                <FieldLabel htmlFor="phone">Phone Number</FieldLabel>
                <Input
                  {...register("phone")}
                  id="phone"
                  type="tel"
                  placeholder="+233 XX XXX XXXX"
                  disabled={isSubmitting}
                />
                <FieldError errors={[errors.phone]} />
              </Field>

              <p className="text-xs text-muted-foreground mt-2">
                If provided, a profile will be pre-created for the user
              </p>
            </div>
          </FieldGroup>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
