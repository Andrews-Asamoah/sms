// components/school/teachers/teacher-dialog.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Loader2, Mail, UserCheck } from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

// ─── Invite Mode Schema (new teacher — email only, no bio) ───────────────────
const teacherInviteSchema = z.object({
  email: z.email("Valid email is required"),
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
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
  isActive: z.boolean(),
});

// ─── Edit Mode Schema (existing teacher — full bio) ───────────────────────────
const teacherEditSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  otherNames: z.string().optional().nullable(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  phone: z.string().optional().nullable(),

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
  isActive: z.boolean(),
});

type TeacherInviteValues = z.infer<typeof teacherInviteSchema>;
type TeacherEditValues = z.infer<typeof teacherEditSchema>;

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
      /** BetterAuth userId — present when teacher has accepted invitation */
      userId?: string | null;
      /** Profile photo URL */
      image?: string | null;
    };
  };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TeacherDialog({
  children,
  schoolId,
  schoolSlug,
  departments,
  houses,
  teacher,
  open: externalOpen,
  onOpenChange: setExternalOpen,
}: TeacherDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = externalOpen !== undefined;
  const open = isControlled ? externalOpen : internalOpen;
  const setOpen = isControlled ? setExternalOpen! : setInternalOpen;
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Confirmation state for existing members
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    existingUser: {
      id: string;
      name: string;
      email: string;
      isMember: boolean;
    } | null;
    pendingData: TeacherInviteValues | null;
  }>({ open: false, existingUser: null, pendingData: null });

  const isEditMode = !!teacher;

  // ─── Invite form ──────────────────────────────────────────────────────────
  const inviteForm = useForm<TeacherInviteValues>({
    resolver: zodResolver(teacherInviteSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      staffNumber: null,
      departmentId: "",
      houseId: null,
      qualification: null,
      specialization: null,
      experience: null,
      employmentType: "FULL_TIME",
      hireDate: new Date().toISOString().split("T")[0],
      isActive: true,
    },
  });

  // ─── Edit form ────────────────────────────────────────────────────────────
  const editForm = useForm<TeacherEditValues>({
    resolver: zodResolver(teacherEditSchema),
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
          staffNumber: teacher.staffNumber,
          departmentId: teacher.department.id,
          houseId: teacher.house?.id || null,
          qualification: teacher.qualification,
          specialization: teacher.specialization,
          experience: teacher.experience?.toString() || null,
          employmentType:
            teacher.employmentType as TeacherEditValues["employmentType"],
          hireDate: new Date(teacher.hireDate).toISOString().split("T")[0],
          contractEndDate: teacher.contractEndDate
            ? new Date(teacher.contractEndDate).toISOString().split("T")[0]
            : null,
          isActive: teacher.isActive,
        }
      : undefined,
  });

  // ─── Shared field watchers ────────────────────────────────────────────────
  const inviteIsActive = inviteForm.watch("isActive");
  const inviteEmploymentType = inviteForm.watch("employmentType");
  const inviteDepartmentId = inviteForm.watch("departmentId");
  const inviteHouseId = inviteForm.watch("houseId");

  const editIsActive = editForm.watch("isActive");
  const editGender = editForm.watch("gender");
  const editEmploymentType = editForm.watch("employmentType");
  const editDepartmentId = editForm.watch("departmentId");
  const editHouseId = editForm.watch("houseId");

  // ─── Submit handlers ──────────────────────────────────────────────────────
  async function onInvite(data: TeacherInviteValues, force = false) {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/schools/${schoolSlug}/teachers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          experience: data.experience ? parseInt(data.experience) : null,
          houseId: data.houseId === "none" ? null : data.houseId,
          force,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "Failed to send invitation");
      }

      // Server says this user already exists — ask admin to confirm
      if (json.needsConfirmation) {
        setConfirmState({
          open: true,
          existingUser: json.existingUser,
          pendingData: data,
        });
        return;
      }

      toast.success(json.invited ? "Invitation sent" : "Teacher added", {
        description: json.invited
          ? `An invitation email has been sent to ${data.email}. They'll appear as active once they accept.`
          : `${json.existingUser?.name || data.email} has been added as a teacher.`,
      });

      setOpen(false);
      inviteForm.reset();
      router.refresh();
    } catch (error) {
      toast.error("Failed to invite teacher", {
        description:
          error instanceof Error ? error.message : "Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onEdit(data: TeacherEditValues) {
    if (!teacher) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/schools/${schoolSlug}/teachers/${teacher.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...data,
            experience: data.experience ? parseInt(data.experience) : null,
            houseId: data.houseId === "none" ? null : data.houseId,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update teacher");
      }

      toast.success("Teacher updated successfully", {
        description: `${data.firstName} ${data.lastName} has been updated.`,
      });

      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error("Failed to update teacher", {
        description:
          error instanceof Error ? error.message : "Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // ─── Shared Employment Sub-form ───────────────────────────────────────────
  function EmploymentFields({
    employmentType,
    departmentId,
    houseId,
    isActive,
    onEmploymentTypeChange,
    onDepartmentChange,
    onHouseChange,
    onActiveChange,
    registration,
    errors,
    showContractEndDate,
  }: {
    employmentType: string;
    departmentId: string;
    houseId: string | null | undefined;
    isActive: boolean;
    onEmploymentTypeChange: (v: string) => void;
    onDepartmentChange: (v: string) => void;
    onHouseChange: (v: string) => void;
    onActiveChange: (v: boolean) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registration: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    errors: any;
    showContractEndDate: boolean;
  }) {
    return (
      <>
        {/* Academic Information */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold text-sm">Academic Information</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <FieldGroup>
              <FieldLabel htmlFor="staffNumber">Staff Number</FieldLabel>
              <Input
                id="staffNumber"
                placeholder="Auto-generated"
                disabled
                {...registration("staffNumber")}
              />
            </FieldGroup>

            <FieldGroup>
              <FieldLabel htmlFor="departmentId">Department *</FieldLabel>
              <Select value={departmentId} onValueChange={onDepartmentChange}>
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
              <Select value={houseId || "none"} onValueChange={onHouseChange}>
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
                {...registration("qualification")}
              />
            </FieldGroup>

            <FieldGroup>
              <FieldLabel htmlFor="specialization">Specialization</FieldLabel>
              <Input
                id="specialization"
                placeholder="e.g., Mathematics"
                {...registration("specialization")}
              />
            </FieldGroup>

            <FieldGroup>
              <FieldLabel htmlFor="experience">Years of Experience</FieldLabel>
              <Input
                id="experience"
                type="number"
                min="0"
                placeholder="e.g., 5"
                {...registration("experience")}
              />
            </FieldGroup>
          </div>
        </div>

        {/* Employment Details */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold text-sm">Employment Details</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <FieldGroup>
              <FieldLabel htmlFor="employmentType">
                Employment Type *
              </FieldLabel>
              <Select
                value={employmentType}
                onValueChange={onEmploymentTypeChange}
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
              <Input id="hireDate" type="date" {...registration("hireDate")} />
              {errors.hireDate && (
                <FieldError>{errors.hireDate.message}</FieldError>
              )}
            </FieldGroup>

            {showContractEndDate && (
              <FieldGroup>
                <FieldLabel htmlFor="contractEndDate">
                  Contract End Date
                </FieldLabel>
                <Input
                  id="contractEndDate"
                  type="date"
                  {...registration("contractEndDate")}
                />
              </FieldGroup>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center space-x-2 pb-4 pt-4 border-t">
          <Switch
            id="isActive"
            checked={isActive}
            onCheckedChange={onActiveChange}
          />
          <Label htmlFor="isActive">Active Teacher</Label>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Existing member confirmation alert */}
      <AlertDialog
        open={confirmState.open}
        onOpenChange={(o) => setConfirmState((s) => ({ ...s, open: o }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-amber-500" />
              User Already Exists
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{confirmState.existingUser?.name}</strong> (
              {confirmState.existingUser?.email}) is already{" "}
              {confirmState.existingUser?.isMember
                ? "a member of this school"
                : "registered in the system"}
              . Would you like to add the <strong>Teacher</strong> role to their
              account without sending a new invitation?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() =>
                setConfirmState({
                  open: false,
                  existingUser: null,
                  pendingData: null,
                })
              }
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (confirmState.pendingData) {
                  setConfirmState((s) => ({ ...s, open: false }));
                  await onInvite(confirmState.pendingData, true);
                }
              }}
            >
              Yes, Add as Teacher
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              {isEditMode ? "Edit Teacher" : "Invite New Teacher"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Update teacher information and assignments."
                : "Send an email invitation to a new teacher. They'll complete their profile when they accept."}
            </DialogDescription>
          </DialogHeader>

          {/* ─── INVITE FORM ─────────────────────────────────────────────────── */}
          {!isEditMode && (
            <form
              onSubmit={inviteForm.handleSubmit((data) => onInvite(data))}
              className="flex flex-col overflow-hidden flex-1"
            >
              <div className="space-y-6 overflow-y-auto pr-1 flex-1">
                {/* Email */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Invitation Email
                  </h3>
                  <FieldGroup>
                    <FieldLabel htmlFor="email">Email Address *</FieldLabel>
                    <Input
                      id="email"
                      type="email"
                      placeholder="teacher@example.com"
                      {...inviteForm.register("email")}
                    />
                    {inviteForm.formState.errors.email && (
                      <FieldError>
                        {inviteForm.formState.errors.email.message}
                      </FieldError>
                    )}
                  </FieldGroup>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldGroup>
                      <FieldLabel htmlFor="firstName">First Name *</FieldLabel>
                      <Input
                        id="firstName"
                        placeholder="e.g., John"
                        {...inviteForm.register("firstName")}
                      />
                      {inviteForm.formState.errors.firstName && (
                        <FieldError>
                          {inviteForm.formState.errors.firstName.message}
                        </FieldError>
                      )}
                    </FieldGroup>
                    <FieldGroup>
                      <FieldLabel htmlFor="lastName">Last Name *</FieldLabel>
                      <Input
                        id="lastName"
                        placeholder="e.g., Doe"
                        {...inviteForm.register("lastName")}
                      />
                      {inviteForm.formState.errors.lastName && (
                        <FieldError>
                          {inviteForm.formState.errors.lastName.message}
                        </FieldError>
                      )}
                    </FieldGroup>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The teacher will receive an email invitation. These details
                    will be pre-filled when they sign up.
                  </p>
                </div>

                <EmploymentFields
                  employmentType={inviteEmploymentType}
                  departmentId={inviteDepartmentId}
                  houseId={inviteHouseId}
                  isActive={inviteIsActive}
                  onEmploymentTypeChange={(v) =>
                    inviteForm.setValue(
                      "employmentType",
                      v as TeacherInviteValues["employmentType"],
                    )
                  }
                  onDepartmentChange={(v) =>
                    inviteForm.setValue("departmentId", v)
                  }
                  onHouseChange={(v) =>
                    inviteForm.setValue("houseId", v === "none" ? null : v)
                  }
                  onActiveChange={(v) => inviteForm.setValue("isActive", v)}
                  registration={inviteForm.register}
                  errors={inviteForm.formState.errors}
                  showContractEndDate={false}
                />
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
                  Send Invitation
                </Button>
              </DialogFooter>
            </form>
          )}

          {/* ─── EDIT FORM ───────────────────────────────────────────────────── */}
          {isEditMode && (
            <form
              onSubmit={editForm.handleSubmit(onEdit)}
              className="flex flex-col overflow-hidden flex-1"
            >
              <div className="space-y-6 overflow-y-auto pr-1 flex-1">
                {/* Profile Photo — only shown when the teacher has accepted their invite */}
                {teacher?.profile?.userId && (
                  <div className="flex flex-col items-center gap-2 pb-2">
                    <UserAvatarUploader
                      userId={teacher.profile.userId}
                      schoolSlug={schoolSlug}
                      entityType="teacher"
                      currentImage={teacher.profile.image}
                      displayName={`${teacher.profile.firstName} ${teacher.profile.lastName}`}
                    />
                    <p className="text-xs text-muted-foreground">Profile photo</p>
                  </div>
                )}

                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm">
                    Personal Information
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldGroup>
                      <FieldLabel htmlFor="firstName">First Name *</FieldLabel>
                      <Input
                        id="firstName"
                        placeholder="e.g., John"
                        {...editForm.register("firstName")}
                      />
                      {editForm.formState.errors.firstName && (
                        <FieldError>
                          {editForm.formState.errors.firstName.message}
                        </FieldError>
                      )}
                    </FieldGroup>

                    <FieldGroup>
                      <FieldLabel htmlFor="lastName">Last Name *</FieldLabel>
                      <Input
                        id="lastName"
                        placeholder="e.g., Doe"
                        {...editForm.register("lastName")}
                      />
                      {editForm.formState.errors.lastName && (
                        <FieldError>
                          {editForm.formState.errors.lastName.message}
                        </FieldError>
                      )}
                    </FieldGroup>

                    <FieldGroup>
                      <FieldLabel htmlFor="otherNames">Other Names</FieldLabel>
                      <Input
                        id="otherNames"
                        placeholder="Optional"
                        {...editForm.register("otherNames")}
                      />
                    </FieldGroup>

                    <FieldGroup>
                      <FieldLabel htmlFor="gender">Gender *</FieldLabel>
                      <Select
                        value={editGender}
                        onValueChange={(value) =>
                          editForm.setValue(
                            "gender",
                            value as "MALE" | "FEMALE" | "OTHER",
                          )
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
                      {editForm.formState.errors.gender && (
                        <FieldError>
                          {editForm.formState.errors.gender.message}
                        </FieldError>
                      )}
                    </FieldGroup>

                    <FieldGroup>
                      <FieldLabel htmlFor="dateOfBirth">
                        Date of Birth *
                      </FieldLabel>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        {...editForm.register("dateOfBirth")}
                      />
                      {editForm.formState.errors.dateOfBirth && (
                        <FieldError>
                          {editForm.formState.errors.dateOfBirth.message}
                        </FieldError>
                      )}
                    </FieldGroup>

                    <FieldGroup>
                      <FieldLabel htmlFor="phone">Phone</FieldLabel>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="e.g., 0241234567"
                        {...editForm.register("phone")}
                      />
                    </FieldGroup>
                  </div>
                </div>

                <EmploymentFields
                  employmentType={editEmploymentType}
                  departmentId={editDepartmentId}
                  houseId={editHouseId}
                  isActive={editIsActive}
                  onEmploymentTypeChange={(v) =>
                    editForm.setValue(
                      "employmentType",
                      v as TeacherEditValues["employmentType"],
                    )
                  }
                  onDepartmentChange={(v) =>
                    editForm.setValue("departmentId", v)
                  }
                  onHouseChange={(v) =>
                    editForm.setValue("houseId", v === "none" ? null : v)
                  }
                  onActiveChange={(v) => editForm.setValue("isActive", v)}
                  registration={editForm.register}
                  errors={editForm.formState.errors}
                  showContractEndDate={true}
                />
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
                  Update Teacher
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
