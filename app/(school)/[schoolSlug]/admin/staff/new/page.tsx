"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, Mail, Briefcase, ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const staffInviteSchema = z.object({
  email: z.string().email("Valid email is required"),
  role: z.enum(["ACCOUNTANT", "ADMIN", "HEADTEACHER"]),
  firstName: z
    .string()
    .min(2, "First name is optional but recommended")
    .optional()
    .or(z.literal("")),
  lastName: z
    .string()
    .min(2, "Last name is optional but recommended")
    .optional()
    .or(z.literal("")),
});

type StaffInviteFormValues = z.infer<typeof staffInviteSchema>;

export default function InviteStaffPage() {
  const router = useRouter();
  const params = useParams();
  const schoolSlug = params.schoolSlug as string;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<StaffInviteFormValues>({
    resolver: zodResolver(staffInviteSchema),
    defaultValues: {
      email: "",
      role: "ADMIN",
      firstName: "",
      lastName: "",
    },
  });

  const role = watch("role");

  async function onSubmit(data: StaffInviteFormValues) {
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        firstName: data.firstName || undefined,
        lastName: data.lastName || undefined,
      };

      const response = await fetch(`/api/schools/${schoolSlug}/invite-admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to invite staff member");
      }

      toast.success("Staff Invitation Sent", {
        description: `An invitation has been sent to ${data.email}.`,
      });

      // Redirect back to staff directory after successful invitation
      router.push(`/${schoolSlug}/admin/staff`);
      router.refresh();
    } catch (error) {
      console.error("Staff invite error:", error);
      toast.error("Invitation Failed", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex-1 space-y-6 flex flex-col items-center justify-center p-4 md:p-8 pt-6 min-h-[80vh]">
      <div className="w-full max-w-lg mb-4 text-left">
        <Button variant="ghost" asChild className="mb-4 -ml-4">
          <Link href={`/${schoolSlug}/admin/staff`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Staff Directory
          </Link>
        </Button>
      </div>

      <Card className="w-full max-w-lg shadow-md border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            Invite Staff Member
          </CardTitle>
            Send an email invitation to add a new staff member, accountant,
            headteacher, or admin to the school system.
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <FieldGroup>
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="email">Email Address *</FieldLabel>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    placeholder="staff@example.com"
                    className="pl-9"
                    {...register("email")}
                  />
                </div>
                <FieldDescription>
                  The invitation link will be sent to this email.
                </FieldDescription>
                <FieldError errors={[errors.email]} />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field data-invalid={!!errors.firstName}>
                  <FieldLabel htmlFor="firstName">
                    First Name (Optional)
                  </FieldLabel>
                  <Input
                    id="firstName"
                    placeholder="e.g. Jane"
                    {...register("firstName")}
                  />
                  <FieldError errors={[errors.firstName]} />
                </Field>

                <Field data-invalid={!!errors.lastName}>
                  <FieldLabel htmlFor="lastName">
                    Last Name (Optional)
                  </FieldLabel>
                  <Input
                    id="lastName"
                    placeholder="e.g. Doe"
                    {...register("lastName")}
                  />
                  <FieldError errors={[errors.lastName]} />
                </Field>
              </div>

              <Field data-invalid={!!errors.role}>
                <FieldLabel>System Role *</FieldLabel>
                <Select
                  onValueChange={(val) => setValue("role", val as any)}
                  defaultValue={role}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrator</SelectItem>
                    <SelectItem value="HEADTEACHER">Head Teacher</SelectItem>
                    <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                  </SelectContent>
                </Select>
                <FieldDescription>
                  Determines the permissions the user will have when they sign
                  in.
                </FieldDescription>
                <FieldError errors={[errors.role]} />
              </Field>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Invitation...
                  </>
                ) : (
                  "Send Invitation"
                )}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
