"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, Edit } from "lucide-react";
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
import { UserAvatarUploader } from "@/components/shared/user-avatar-uploader";

const staffEditSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  otherNames: z.string().optional().nullable(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  phone: z.string().optional().nullable(),

  staffNumber: z.string().optional().nullable(),
  jobTitle: z.string().optional().nullable(),
  staffType: z.enum([
    "ACCOUNTANT", "ADMIN", "LIBRARIAN", "DRIVER", "SECURITY", 
    "NURSE", "COUNSELOR", "IT_SUPPORT", "RECEPTIONIST", 
    "COOK", "CLEANER", "OTHER"
  ]),
  departmentId: z.string().optional().nullable(),
  employmentType: z.enum([
    "FULL_TIME", "PART_TIME", "CONTRACT", "TEMPORARY", "INTERN",
  ]),
  hireDate: z.string().min(1, "Hire date is required"),
  contractEndDate: z.string().optional().nullable(),
  isActive: z.boolean(),
});

type StaffEditValues = z.infer<typeof staffEditSchema>;

interface EditStaffDialogProps {
  schoolSlug: string;
  departments: Array<{ id: string; name: string; code: string }>;
  staff: {
    id: string;
    staffNumber: string | null;
    staffType: string;
    jobTitle: string | null;
    isActive: boolean;
    employmentType: string;
    hireDate: Date;
    contractEndDate: Date | null;
    department: { id: string } | null;
    profile: {
      firstName: string;
      lastName: string;
      otherNames: string | null;
      gender: string;
      dateOfBirth: Date;
      phone: string | null;
      /** BetterAuth userId — present when staff member has an active account */
      userId?: string | null;
      /** Profile photo URL */
      image?: string | null;
    };
  };
}

export function EditStaffDialog({ schoolSlug, departments, staff }: EditStaffDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const editForm = useForm<StaffEditValues>({
    resolver: zodResolver(staffEditSchema),
    defaultValues: {
      firstName: staff.profile.firstName,
      lastName: staff.profile.lastName,
      otherNames: staff.profile.otherNames,
      gender: staff.profile.gender as "MALE" | "FEMALE" | "OTHER",
      dateOfBirth: new Date(staff.profile.dateOfBirth).toISOString().split("T")[0],
      phone: staff.profile.phone,
      staffNumber: staff.staffNumber,
      jobTitle: staff.jobTitle,
      staffType: staff.staffType as StaffEditValues["staffType"],
      departmentId: staff.department?.id || null,
      employmentType: staff.employmentType as StaffEditValues["employmentType"],
      hireDate: new Date(staff.hireDate).toISOString().split("T")[0],
      contractEndDate: staff.contractEndDate
        ? new Date(staff.contractEndDate).toISOString().split("T")[0]
        : null,
      isActive: staff.isActive,
    },
  });

  const editGender = editForm.watch("gender");
  const editStaffType = editForm.watch("staffType");
  const editEmploymentType = editForm.watch("employmentType");
  const editDepartmentId = editForm.watch("departmentId");
  const editIsActive = editForm.watch("isActive");

  async function onEdit(data: StaffEditValues) {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/schools/${schoolSlug}/staff/${staff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
           ...data,
           departmentId: data.departmentId === "none" ? null : data.departmentId
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update staff member");
      }

      toast.success("Staff updated successfully", {
        description: `${data.firstName} ${data.lastName} has been updated.`,
      });

      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error("Failed to update staff member", {
        description: error instanceof Error ? error.message : "Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Edit className="h-4 w-4" />
          Edit Details
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Edit Staff Details</DialogTitle>
          <DialogDescription>Update staff information and employment details.</DialogDescription>
        </DialogHeader>

        <form onSubmit={editForm.handleSubmit(onEdit)} className="flex flex-col overflow-hidden flex-1">
          <div className="space-y-6 overflow-y-auto pr-1 flex-1 pb-4">
            {/* Profile Photo */}
            {staff.profile.userId && (
              <div className="flex flex-col items-center gap-2">
                <UserAvatarUploader
                  userId={staff.profile.userId}
                  schoolSlug={schoolSlug}
                  entityType="staff"
                  currentImage={staff.profile.image}
                  displayName={`${staff.profile.firstName} ${staff.profile.lastName}`}
                />
                <p className="text-xs text-muted-foreground">Profile photo</p>
              </div>
            )}

            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Personal Information</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <FieldGroup>
                  <FieldLabel htmlFor="firstName">First Name *</FieldLabel>
                  <Input id="firstName" {...editForm.register("firstName")} />
                  {editForm.formState.errors.firstName && (
                    <FieldError>{editForm.formState.errors.firstName.message}</FieldError>
                  )}
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel htmlFor="lastName">Last Name *</FieldLabel>
                  <Input id="lastName" {...editForm.register("lastName")} />
                  {editForm.formState.errors.lastName && (
                    <FieldError>{editForm.formState.errors.lastName.message}</FieldError>
                  )}
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel htmlFor="otherNames">Other Names</FieldLabel>
                  <Input id="otherNames" {...editForm.register("otherNames")} />
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel htmlFor="gender">Gender *</FieldLabel>
                  <Select value={editGender} onValueChange={(v) => editForm.setValue("gender", v as StaffEditValues["gender"])}>
                    <SelectTrigger id="gender"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {editForm.formState.errors.gender && (
                    <FieldError>{editForm.formState.errors.gender.message}</FieldError>
                  )}
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel htmlFor="dateOfBirth">Date of Birth *</FieldLabel>
                  <Input id="dateOfBirth" type="date" {...editForm.register("dateOfBirth")} />
                  {editForm.formState.errors.dateOfBirth && (
                    <FieldError>{editForm.formState.errors.dateOfBirth.message}</FieldError>
                  )}
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel htmlFor="phone">Phone</FieldLabel>
                  <Input id="phone" type="tel" {...editForm.register("phone")} />
                </FieldGroup>
              </div>
            </div>

            {/* Employment Details */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-sm">Employment Details</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <FieldGroup>
                  <FieldLabel htmlFor="staffNumber">Staff Number</FieldLabel>
                  <Input id="staffNumber" placeholder="Auto-generated" {...editForm.register("staffNumber")} />
                </FieldGroup>
                <FieldGroup>
                 <FieldLabel htmlFor="jobTitle">Job Title</FieldLabel>
                 <Input id="jobTitle" {...editForm.register("jobTitle")} />
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel htmlFor="staffType">Staff Type *</FieldLabel>
                  <Select value={editStaffType} onValueChange={(v) => editForm.setValue("staffType", v as StaffEditValues["staffType"])}>
                    <SelectTrigger id="staffType"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Administrator</SelectItem>
                      <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                      <SelectItem value="LIBRARIAN">Librarian</SelectItem>
                      <SelectItem value="DRIVER">Driver</SelectItem>
                      <SelectItem value="SECURITY">Security</SelectItem>
                      <SelectItem value="NURSE">Nurse</SelectItem>
                      <SelectItem value="COUNSELOR">Counselor</SelectItem>
                      <SelectItem value="IT_SUPPORT">IT Support</SelectItem>
                      <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                      <SelectItem value="COOK">Cook</SelectItem>
                      <SelectItem value="CLEANER">Cleaner</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel htmlFor="departmentId">Department (Optional)</FieldLabel>
                  <Select value={editDepartmentId || "none"} onValueChange={(v) => editForm.setValue("departmentId", v === "none" ? null : v)}>
                    <SelectTrigger id="departmentId"><SelectValue placeholder="Select department" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Department</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel htmlFor="employmentType">Employment Type *</FieldLabel>
                  <Select value={editEmploymentType} onValueChange={(v) => editForm.setValue("employmentType", v as StaffEditValues["employmentType"])}>
                    <SelectTrigger id="employmentType"><SelectValue /></SelectTrigger>
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
                  <Input id="hireDate" type="date" {...editForm.register("hireDate")} />
                  {editForm.formState.errors.hireDate && (
                    <FieldError>{editForm.formState.errors.hireDate.message}</FieldError>
                  )}
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel htmlFor="contractEndDate">Contract End Date</FieldLabel>
                  <Input id="contractEndDate" type="date" {...editForm.register("contractEndDate")} />
                </FieldGroup>
              </div>
            </div>

            <div className="flex items-center space-x-2 pb-4 pt-4 border-t">
              <Switch id="isActive" checked={editIsActive} onCheckedChange={(v) => editForm.setValue("isActive", v)} />
              <Label htmlFor="isActive">Active Staff Member</Label>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
