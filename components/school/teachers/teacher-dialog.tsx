// components/school/teachers/teacher-dialog.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const teacherSchema = z.object({
  // Profile fields
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  otherNames: z.string().optional().nullable(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),

  // Teacher specific fields
  staffNumber: z.string().optional().nullable(),
  departmentId: z.string().min(1, "Department is required"),
  houseId: z.string().optional().nullable(),
  qualification: z.string().optional().nullable(),
  specialization: z.string().optional().nullable(),
  experience: z.string().optional().nullable(),
  employmentType: z.enum([
    "FULL_TIME",
    "PART_TIME",
    "CONTRACT",
    "TEMPORARY",
    "INTERN",
  ]),
  hireDate: z.string().min(1, "Hire date is required"),
  contractEndDate: z.string().optional().nullable(),
  monthlySalary: z.string().optional().nullable(),
  isActive: z.boolean(),
});

type TeacherFormValues = z.infer<typeof teacherSchema>;

interface TeacherDialogProps {
  children: React.ReactNode;
  schoolId: string;
  schoolSlug: string;
  departments: Array<{
    id: string;
    name: string;
    code: string;
  }>;
  houses: Array<{
    id: string;
    name: string;
    code: string;
  }>;
  teacher?: {
    id: string;
    teacherId: string;
    staffNumber: string | null;
    isActive: boolean;
    employmentType: string;
    qualification: string | null;
    specialization: string | null;
    experience: number | null;
    hireDate: Date;
    contractEndDate: Date | null;
    monthlySalary: number | null;
    department: {
      id: string;
    };
    house: {
      id: string;
    } | null;
    profile: {
      firstName: string;
      lastName: string;
      otherNames: string | null;
      gender: string;
      dateOfBirth: Date;
      phone: string | null;
    };
  };
}

export function TeacherDialog({
  children,
  schoolId,
  schoolSlug,
  departments,
  houses,
  teacher,
}: TeacherDialogProps) {
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
  } = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherSchema),
    defaultValues: teacher
      ? {
          firstName: teacher.profile.firstName,
          lastName: teacher.profile.lastName,
          otherNames: teacher.profile.otherNames,
          gender: teacher.profile.gender as "MALE" | "FEMALE" | "OTHER",
          dateOfBirth: new Date(teacher.profile.dateOfBirth)
            .toISOString()
            .split("T")[0],
          phone: teacher.profile.phone,
          email: "",
          staffNumber: teacher.staffNumber,
          departmentId: teacher.department.id,
          houseId: teacher.house?.id || null,
          qualification: teacher.qualification,
          specialization: teacher.specialization,
          experience: teacher.experience?.toString() || null,
          employmentType: teacher.employmentType as any,
          hireDate: new Date(teacher.hireDate).toISOString().split("T")[0],
          contractEndDate: teacher.contractEndDate
            ? new Date(teacher.contractEndDate).toISOString().split("T")[0]
            : null,
          monthlySalary: teacher.monthlySalary?.toString() || null,
          isActive: teacher.isActive,
        }
      : {
          firstName: "",
          lastName: "",
          otherNames: null,
          gender: "MALE",
          dateOfBirth: "",
          phone: null,
          email: "",
          staffNumber: null,
          departmentId: "",
          houseId: null,
          qualification: null,
          specialization: null,
          experience: null,
          employmentType: "FULL_TIME",
          hireDate: new Date().toISOString().split("T")[0],
          contractEndDate: null,
          monthlySalary: null,
          isActive: true,
        },
  });

  const isActive = watch("isActive");
  const gender = watch("gender");
  const employmentType = watch("employmentType");
  const departmentId = watch("departmentId");
  const houseId = watch("houseId");

  async function onSubmit(data: TeacherFormValues) {
    setIsSubmitting(true);

    try {
      const url = teacher
        ? `/api/schools/${schoolSlug}/teachers/${teacher.id}`
        : `/api/schools/${schoolSlug}/teachers`;

      const method = teacher ? "PATCH" : "POST";

      // Transform data for API
      const payload = {
        ...data,
        schoolId,
        experience: data.experience ? parseInt(data.experience) : null,
        monthlySalary: data.monthlySalary
          ? parseFloat(data.monthlySalary)
          : null,
        email: data.email || null,
        houseId: data.houseId === "none" ? null : data.houseId,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save teacher");
      }

      toast.success(
        teacher
          ? "Teacher updated successfully"
          : "Teacher created successfully",
        {
          description: `${data.firstName} ${data.lastName} has been ${teacher ? "updated" : "added"}.`,
        },
      );

      setOpen(false);
      reset();
      router.refresh();
    } catch (error) {
      console.error("Error saving teacher:", error);
      toast.error("Failed to save teacher", {
        description:
          error instanceof Error ? error.message : "Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {teacher ? "Edit Teacher" : "Add New Teacher"}
          </DialogTitle>
          <DialogDescription>
            {teacher
              ? "Update teacher information and assignments."
              : "Add a new teacher to your school. Fill in the details below."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col overflow-hidden flex-1"
        >
          <div className="space-y-6 overflow-y-auto pr-1 flex-1">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Personal Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <FieldGroup>
                  <FieldLabel htmlFor="firstName">First Name *</FieldLabel>
                  <Input
                    id="firstName"
                    placeholder="e.g., John"
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
                    placeholder="e.g., Doe"
                    {...register("lastName")}
                  />
                  {errors.lastName && (
                    <FieldError>{errors.lastName.message}</FieldError>
                  )}
                </FieldGroup>

                <FieldGroup>
                  <FieldLabel htmlFor="otherNames">Other Names</FieldLabel>
                  <Input
                    id="otherNames"
                    placeholder="Optional"
                    {...register("otherNames")}
                  />
                </FieldGroup>

                <FieldGroup>
                  <FieldLabel htmlFor="gender">Gender *</FieldLabel>
                  <Select
                    value={gender}
                    onValueChange={(value) =>
                      setValue("gender", value as "MALE" | "FEMALE" | "OTHER")
                    }
                  >
                    <SelectTrigger id="gender">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.gender && (
                    <FieldError>{errors.gender.message}</FieldError>
                  )}
                </FieldGroup>

                <FieldGroup>
                  <FieldLabel htmlFor="dateOfBirth">Date of Birth *</FieldLabel>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    {...register("dateOfBirth")}
                  />
                  {errors.dateOfBirth && (
                    <FieldError>{errors.dateOfBirth.message}</FieldError>
                  )}
                </FieldGroup>

                <FieldGroup>
                  <FieldLabel htmlFor="phone">Phone</FieldLabel>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="e.g., 0241234567"
                    {...register("phone")}
                  />
                </FieldGroup>

                <FieldGroup>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="teacher@example.com"
                    {...register("email")}
                  />
                  {errors.email && (
                    <FieldError>{errors.email.message}</FieldError>
                  )}
                </FieldGroup>
              </div>
            </div>

            {/* Academic Information */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-sm">Academic Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <FieldGroup>
                  <FieldLabel htmlFor="staffNumber">Staff Number</FieldLabel>
                  <Input
                    id="staffNumber"
                    placeholder="Optional"
                    {...register("staffNumber")}
                  />
                </FieldGroup>

                <FieldGroup>
                  <FieldLabel htmlFor="departmentId">Department *</FieldLabel>
                  <Select
                    value={departmentId}
                    onValueChange={(value) => setValue("departmentId", value)}
                  >
                    <SelectTrigger id="departmentId">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name} ({dept.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.departmentId && (
                    <FieldError>{errors.departmentId.message}</FieldError>
                  )}
                </FieldGroup>

                <FieldGroup>
                  <FieldLabel htmlFor="houseId">House (Optional)</FieldLabel>
                  <Select
                    value={houseId || "none"}
                    onValueChange={(value) =>
                      setValue("houseId", value === "none" ? null : value)
                    }
                  >
                    <SelectTrigger id="houseId">
                      <SelectValue placeholder="Select house" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No house assigned</SelectItem>
                      {houses.map((house) => (
                        <SelectItem key={house.id} value={house.id}>
                          {house.name} ({house.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldGroup>

                <FieldGroup>
                  <FieldLabel htmlFor="qualification">Qualification</FieldLabel>
                  <Input
                    id="qualification"
                    placeholder="e.g., B.Ed, M.Sc"
                    {...register("qualification")}
                  />
                </FieldGroup>

                <FieldGroup>
                  <FieldLabel htmlFor="specialization">
                    Specialization
                  </FieldLabel>
                  <Input
                    id="specialization"
                    placeholder="e.g., Mathematics"
                    {...register("specialization")}
                  />
                </FieldGroup>

                <FieldGroup>
                  <FieldLabel htmlFor="experience">
                    Years of Experience
                  </FieldLabel>
                  <Input
                    id="experience"
                    type="number"
                    min="0"
                    placeholder="e.g., 5"
                    {...register("experience")}
                  />
                </FieldGroup>
              </div>
            </div>

            {/* Employment Information */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-sm">Employment Details</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <FieldGroup>
                  <FieldLabel htmlFor="employmentType">
                    Employment Type *
                  </FieldLabel>
                  <Select
                    value={employmentType}
                    onValueChange={(value) =>
                      setValue("employmentType", value as any)
                    }
                  >
                    <SelectTrigger id="employmentType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FULL_TIME">Full Time</SelectItem>
                      <SelectItem value="PART_TIME">Part Time</SelectItem>
                      <SelectItem value="CONTRACT">Contract</SelectItem>
                      <SelectItem value="TEMPORARY">Temporary</SelectItem>
                      <SelectItem value="INTERN">Intern</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldGroup>

                <FieldGroup>
                  <FieldLabel htmlFor="hireDate">Hire Date *</FieldLabel>
                  <Input id="hireDate" type="date" {...register("hireDate")} />
                  {errors.hireDate && (
                    <FieldError>{errors.hireDate.message}</FieldError>
                  )}
                </FieldGroup>

                <FieldGroup>
                  <FieldLabel htmlFor="contractEndDate">
                    Contract End Date
                  </FieldLabel>
                  <Input
                    id="contractEndDate"
                    type="date"
                    {...register("contractEndDate")}
                  />
                </FieldGroup>

                <FieldGroup>
                  <FieldLabel htmlFor="monthlySalary">
                    Monthly Salary (GHS)
                  </FieldLabel>
                  <Input
                    id="monthlySalary"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g., 3500.00"
                    {...register("monthlySalary")}
                  />
                </FieldGroup>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center space-x-2 pb-4 pt-4 border-t">
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={(checked) => setValue("isActive", checked)}
              />
              <Label htmlFor="isActive">Active Teacher</Label>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 pt-4 border-t">
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
              {teacher ? "Update Teacher" : "Add Teacher"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
