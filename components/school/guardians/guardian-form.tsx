"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  FieldDescription,
} from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

const guardianSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(8, "Valid phone number is required"),
  alternatePhone: z.string().optional(),
  occupation: z.string().optional(),
  address: z.string().optional(),
  relationshipType: z.enum([
    "FATHER",
    "MOTHER",
    "GUARDIAN",
    "SIBLING",
    "RELATIVE",
    "OTHER",
  ]),
  wards: z
    .array(
      z.object({
        studentId: z.string().min(1, "Student is required"),
        isPrimary: z.boolean(),
      }),
    )
    .min(1, "At least one ward must be linked"),
});

type GuardianFormValues = z.infer<typeof guardianSchema>;

interface Student {
  id: string;
  name: string;
  studentId: string;
  class: string;
}

interface GuardianFormProps {
  schoolId: string;
  schoolSlug: string;
  students: Student[];
}

export function GuardianForm({
  schoolSlug,
  students,
}: GuardianFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<GuardianFormValues>({
    resolver: zodResolver(guardianSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      alternatePhone: "",
      occupation: "",
      address: "",
      relationshipType: "FATHER",
      wards: [{ studentId: "", isPrimary: true }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    name: "wards",
    control,
  });

  const relationshipType = watch("relationshipType");
  const wards = watch("wards");

  const onSubmit: SubmitHandler<GuardianFormValues> = async (data) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/schools/${schoolSlug}/guardians`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create guardian");
      }

      toast.success("Success", {
        description: "Guardian created and linked successfully",
      });
      router.push(`/schools/${schoolSlug}/admin/guardians`);
      router.refresh();
    } catch (error) {
      toast.error("Error", {
        description:
          error instanceof Error ? error.message : "Something went wrong",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Guardian Info */}
        <Card>
          <CardHeader>
            <CardTitle>Guardian Details</CardTitle>
            <CardDescription>
              Basic information about the parent or guardian.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field data-invalid={!!errors.firstName}>
                  <FieldLabel htmlFor="gd-first-name">First Name</FieldLabel>
                  <Input id="gd-first-name" placeholder="John" {...register("firstName")} />
                  <FieldError errors={[errors.firstName]} />
                </Field>
                <Field data-invalid={!!errors.lastName}>
                  <FieldLabel htmlFor="gd-last-name">Last Name</FieldLabel>
                  <Input id="gd-last-name" placeholder="Doe" {...register("lastName")} />
                  <FieldError errors={[errors.lastName]} />
                </Field>
              </div>

              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="gd-email">Email Address</FieldLabel>
                <Input
                  id="gd-email"
                  type="email"
                  placeholder="john.doe@example.com"
                  {...register("email")}
                />
                <FieldError errors={[errors.email]} />
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field data-invalid={!!errors.phone}>
                  <FieldLabel htmlFor="gd-phone">Phone Number</FieldLabel>
                  <Input id="gd-phone" placeholder="+233..." {...register("phone")} />
                  <FieldError errors={[errors.phone]} />
                </Field>
                <Field data-invalid={!!errors.alternatePhone}>
                  <FieldLabel htmlFor="gd-alt-phone">Alt Phone (Optional)</FieldLabel>
                  <Input id="gd-alt-phone" placeholder="+233..." {...register("alternatePhone")} />
                  <FieldError errors={[errors.alternatePhone]} />
                </Field>
              </div>

              <Field data-invalid={!!errors.relationshipType}>
                <FieldLabel htmlFor="gd-relation">System Relationship</FieldLabel>
                <Select
                  onValueChange={(val) => setValue("relationshipType", val as any)}
                  value={relationshipType}
                >
                  <SelectTrigger id="gd-relation">
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
                <FieldDescription>
                  This defines the primary relationship for system records.
                </FieldDescription>
                <FieldError errors={[errors.relationshipType]} />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Linked Wards */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle>Linked Wards</CardTitle>
              <CardDescription>
                Select students belonging to this guardian.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ studentId: "", isPrimary: true })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Ward
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="relative flex flex-col gap-4 rounded-lg border p-4"
              >
                <Field data-invalid={!!errors.wards?.[index]?.studentId}>
                  <FieldLabel htmlFor={`ward-${index}`}>Student</FieldLabel>
                  <Select
                    onValueChange={(val) => setValue(`wards.${index}.studentId`, val)}
                    value={wards[index]?.studentId}
                  >
                    <SelectTrigger id={`ward-${index}`}>
                      <SelectValue placeholder="Select a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name} ({student.class})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError errors={[errors.wards?.[index]?.studentId]} />
                </Field>

                <Field orientation="horizontal" className="items-center space-x-3">
                  <Checkbox
                    id={`primary-${index}`}
                    checked={wards[index]?.isPrimary}
                    onCheckedChange={(val) => setValue(`wards.${index}.isPrimary`, !!val)}
                  />
                  <div className="space-y-1 leading-none">
                    <FieldLabel htmlFor={`primary-${index}`}>Primary Guardian</FieldLabel>
                  </div>
                </Field>

                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2 h-8 w-8 text-destructive"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            <FieldError errors={[errors.wards]} />
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end space-x-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? "Creating..." : "Create Guardian"}
        </Button>
      </div>
    </form>
  );
}
