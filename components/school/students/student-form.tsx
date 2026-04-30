// components/school/students/student-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Loader2,
  Save,
  User,
  MapPin,
  Heart,
  GraduationCap,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { UserAvatarUploader } from "@/components/shared/user-avatar-uploader";
import { updateUserImageByAdmin } from "@/actions/user-image";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useRef } from "react";

// ---------------------------------------------------------------------------
// LocalAvatarPicker
// Used only during *create* mode, where we don't yet have a userId.
// It collects a file + shows a preview, then StudentForm uploads it after
// the student is created and returns a userId.
// ---------------------------------------------------------------------------
function LocalAvatarPicker({
  displayName,
  onFileSelected,
}: {
  displayName: string;
  onFileSelected: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const initials = displayName
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) return;
    if (file.size > 2 * 1024 * 1024) return;
    onFileSelected(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="relative">
      <Avatar className="h-24 w-24 border-4 border-background shadow-lg ring-2 ring-border">
        {preview ? (
          <img src={preview} alt="preview" className="h-full w-full object-cover rounded-full" />
        ) : (
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/40 text-primary text-xl font-semibold">
            {initials || <User className="h-8 w-8" />}
          </AvatarFallback>
        )}
      </Avatar>
      <label
        htmlFor="new-student-avatar"
        className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow-md border-2 border-background transition-transform hover:scale-110 active:scale-95"
        title="Upload photo"
      >
        <Camera className="h-3.5 w-3.5" />
        <input
          ref={inputRef}
          id="new-student-avatar"
          type="file"
          className="sr-only"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleChange}
        />
      </label>
    </div>
  );
}

const studentFormSchema = z.object({
  // Personal Information
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  otherNames: z.string().optional().nullable(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  nationality: z.string().optional().nullable(),

  // Contact Information
  phone: z.string().optional().nullable(),
  alternatePhone: z.string().optional().nullable(),

  // Address Information
  residentialAddress: z.string().optional().nullable(),
  postalAddress: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  country: z.string().optional().nullable(),

  // Student Specific
  studentId: z.string().min(1, "Student ID is required"),
  admissionNumber: z.string().min(1, "Admission number is required"),
  admissionDate: z.string().min(1, "Admission date is required"),
  classId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  // houseId is auto-assigned by the server (school-level balanced distribution).

  // Previous School
  previousSchool: z.string().optional().nullable(),
  previousClass: z.string().optional().nullable(),

  // Medical Information
  bloodGroup: z.string().optional().nullable(),
  allergies: z.string().optional().nullable(),
  medicalConditions: z.string().optional().nullable(),

  // Emergency Contact
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),
  emergencyRelationship: z.string().optional().nullable(),
});

type StudentFormValues = z.infer<typeof studentFormSchema>;

interface StudentFormProps {
  schoolId: string;
  schoolSlug: string;
  classes: Array<{ id: string; name: string; academicYear: { name: string } }>;
  departments: Array<{ id: string; name: string }>;
  houses?: Array<{ id: string; name: string }>;
  suggestedStudentId: string;
  suggestedAdmissionNumber?: string;
  initialData?: Partial<StudentFormValues>;
  studentProfileId?: string;
  /** BetterAuth userId — provided when editing an existing student */
  userId?: string;
  /** Current profile image URL — provided when editing */
  currentImage?: string | null;
}

export function StudentForm({
  schoolId,
  schoolSlug,
  classes,
  departments,
  houses,
  suggestedStudentId,
  suggestedAdmissionNumber,
  initialData,
  studentProfileId,
  userId,
  currentImage,
}: StudentFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // For create mode: we queue a pending image file and upload it once we have the userId.
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const isEditing = !!studentProfileId;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    control,
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: (initialData || {
      studentId: suggestedStudentId,
      admissionNumber: suggestedAdmissionNumber || "",
      nationality: "Ghanaian",
      country: "Ghana",
      admissionDate: new Date().toISOString().split("T")[0],
      gender: "MALE",
    }) as any,
  });

  async function onSubmit(data: any) {
    setIsSubmitting(true);
    try {
      const url = studentProfileId
        ? `/api/schools/${schoolSlug}/students/${studentProfileId}`
        : `/api/schools/${schoolSlug}/students`;
      const method = studentProfileId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, schoolId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save student");
      }

      const result = await response.json();

      // After create: upload the queued photo now that we have a userId
      if (!isEditing && pendingImageFile && result.student?.userId) {
        const imgFormData = new FormData();
        imgFormData.append("image", pendingImageFile);
        // Fire-and-forget — photo failure shouldn't block navigation
        updateUserImageByAdmin(result.student.userId, imgFormData, "student", schoolSlug).catch(
          (err) => console.error("[StudentForm] Photo upload failed:", err)
        );
      }

      toast.success(
        studentProfileId
          ? "Student updated successfully"
          : "Student created successfully",
        {
          description: studentProfileId
            ? `${data.firstName} ${data.lastName} has been updated.`
            : `${data.firstName} ${data.lastName} has been added.`,
        },
      );

      const targetId = result.student?.id || result.id;
      if (targetId) {
        router.push(`/${schoolSlug}/admin/students/${targetId}`);
      } else {
        router.push(`/${schoolSlug}/admin/students`);
      }
      router.refresh();
    } catch (error) {
      console.error("Error saving student:", error);
      toast.error("Failed to save student", {
        description:
          error instanceof Error ? error.message : "Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Profile Photo */}
      <div className="flex flex-col items-center gap-2">
        {isEditing && userId ? (
          // Edit mode: uploader talks directly to R2 via server action
          <UserAvatarUploader
            userId={userId}
            schoolSlug={schoolSlug}
            entityType="student"
            currentImage={currentImage}
            displayName={`${watch("firstName") || ""} ${watch("lastName") || ""}`.trim() || "Student"}
          />
        ) : (
          // Create mode: collect the file and upload after the student is created
          <LocalAvatarPicker
            displayName={`${watch("firstName") || ""} ${watch("lastName") || ""}`.trim() || "Student"}
            onFileSelected={setPendingImageFile}
          />
        )}
        <p className="text-xs text-muted-foreground">
          {isEditing ? "Click the camera icon to change photo" : "Optional: upload a photo now (max 2 MB)"}
        </p>
      </div>

      <Separator />

      {/* Personal Information */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Personal Information</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
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
            <Input id="lastName" placeholder="Doe" {...register("lastName")} />
            {errors.lastName && (
              <FieldError>{errors.lastName.message}</FieldError>
            )}
          </FieldGroup>
          <FieldGroup>
            <FieldLabel htmlFor="otherNames">Other Names</FieldLabel>
            <Input
              id="otherNames"
              placeholder="Middle name"
              {...register("otherNames")}
            />
          </FieldGroup>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <FieldGroup>
            <FieldLabel htmlFor="gender">Gender *</FieldLabel>
            <Select
              value={watch("gender")}
              onValueChange={(value) =>
                setValue("gender", value as "MALE" | "FEMALE" | "OTHER")
              }
            >
              <SelectTrigger id="gender">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">Male</SelectItem>
                <SelectItem value="FEMALE">Female</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.gender && <FieldError>{errors.gender.message}</FieldError>}
          </FieldGroup>
          <FieldGroup>
            <FieldLabel htmlFor="dateOfBirth">Date of Birth *</FieldLabel>
            <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
            {errors.dateOfBirth && (
              <FieldError>{errors.dateOfBirth.message}</FieldError>
            )}
          </FieldGroup>
          <FieldGroup>
            <FieldLabel htmlFor="nationality">Nationality</FieldLabel>
            <Input
              id="nationality"
              placeholder="Ghanaian"
              {...register("nationality")}
            />
          </FieldGroup>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FieldGroup>
            <FieldLabel htmlFor="phone">Phone Number</FieldLabel>
            <Input
              id="phone"
              placeholder="+233 24 123 4567"
              {...register("phone")}
            />
          </FieldGroup>
          <FieldGroup>
            <FieldLabel htmlFor="alternatePhone">Alternate Phone</FieldLabel>
            <Input
              id="alternatePhone"
              placeholder="+233 20 987 6543"
              {...register("alternatePhone")}
            />
          </FieldGroup>
        </div>
      </div>

      <Separator />

      {/* Address Information */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Address Information</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FieldGroup>
            <FieldLabel htmlFor="residentialAddress">
              Residential Address
            </FieldLabel>
            <Textarea
              id="residentialAddress"
              placeholder="Enter residential address"
              {...register("residentialAddress")}
            />
          </FieldGroup>
          <FieldGroup>
            <FieldLabel htmlFor="postalAddress">Postal Address</FieldLabel>
            <Textarea
              id="postalAddress"
              placeholder="P.O. Box..."
              {...register("postalAddress")}
            />
          </FieldGroup>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <FieldGroup>
            <FieldLabel htmlFor="city">City</FieldLabel>
            <Input id="city" placeholder="Accra" {...register("city")} />
          </FieldGroup>
          <FieldGroup>
            <FieldLabel htmlFor="region">Region</FieldLabel>
            <Input
              id="region"
              placeholder="Greater Accra"
              {...register("region")}
            />
          </FieldGroup>
          <FieldGroup>
            <FieldLabel htmlFor="country">Country</FieldLabel>
            <Input id="country" placeholder="Ghana" {...register("country")} />
          </FieldGroup>
        </div>
      </div>

      <Separator />

      {/* Student Information */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Student Information</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <FieldGroup>
            <FieldLabel htmlFor="studentId">Student ID *</FieldLabel>
            <Input
              id="studentId"
              placeholder={`STU-${new Date().getFullYear()}-0001`}
              {...register("studentId")}
              disabled
              className="bg-muted"
            />
            <p className="text-sm text-muted-foreground">
              Auto-generated unique identifier
            </p>
            {errors.studentId && (
              <FieldError>{errors.studentId.message}</FieldError>
            )}
          </FieldGroup>
          <FieldGroup>
            <FieldLabel htmlFor="admissionNumber">
              Admission Number *
            </FieldLabel>
            <Input
              id="admissionNumber"
              placeholder={`${schoolSlug.toUpperCase()}-${new Date().getFullYear().toString().slice(-2)}-0001`}
              {...register("admissionNumber")}
              disabled
              className="bg-muted"
            />
            <p className="text-sm text-muted-foreground">
              Auto-generated based on school slug
            </p>
            {errors.admissionNumber && (
              <FieldError>{errors.admissionNumber.message}</FieldError>
            )}
          </FieldGroup>
          <FieldGroup>
            <FieldLabel htmlFor="admissionDate">Admission Date *</FieldLabel>
            <Input
              id="admissionDate"
              type="date"
              {...register("admissionDate")}
            />
            {errors.admissionDate && (
              <FieldError>{errors.admissionDate.message}</FieldError>
            )}
          </FieldGroup>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FieldGroup>
            <FieldLabel htmlFor="classId">Class</FieldLabel>
            <Select
              value={watch("classId") || ""}
              onValueChange={(value) => setValue("classId", value)}
            >
              <SelectTrigger id="classId">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name} ({cls.academicYear.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldGroup>
          {/* House is auto-assigned by the server */}
          <div className="flex items-start gap-3 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-3">
            <span className="mt-0.5 text-muted-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-medium">House (Auto-assigned)</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                A house will be automatically assigned based on balanced school
                distribution once a class is selected.
              </p>
            </div>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FieldGroup>
            <FieldLabel htmlFor="previousSchool">Previous School</FieldLabel>
            <Input
              id="previousSchool"
              placeholder="Name of previous school"
              {...register("previousSchool")}
            />
          </FieldGroup>
          <FieldGroup>
            <FieldLabel htmlFor="previousClass">
              Previous Class/Grade
            </FieldLabel>
            <Input
              id="previousClass"
              placeholder="Grade 5"
              {...register("previousClass")}
            />
          </FieldGroup>
        </div>
      </div>

      <Separator />

      {/* Medical & Emergency Information */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">
            Medical & Emergency Information
          </h3>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <FieldGroup>
            <FieldLabel htmlFor="bloodGroup">Blood Group</FieldLabel>
            <Select
              value={watch("bloodGroup") || ""}
              onValueChange={(value) => setValue("bloodGroup", value)}
            >
              <SelectTrigger id="bloodGroup">
                <SelectValue placeholder="Select blood group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A+">A+</SelectItem>
                <SelectItem value="A-">A-</SelectItem>
                <SelectItem value="B+">B+</SelectItem>
                <SelectItem value="B-">B-</SelectItem>
                <SelectItem value="AB+">AB+</SelectItem>
                <SelectItem value="AB-">AB-</SelectItem>
                <SelectItem value="O+">O+</SelectItem>
                <SelectItem value="O-">O-</SelectItem>
              </SelectContent>
            </Select>
          </FieldGroup>
          <FieldGroup>
            <FieldLabel htmlFor="allergies">Allergies</FieldLabel>
            <Input
              id="allergies"
              placeholder="Any known allergies"
              {...register("allergies")}
            />
          </FieldGroup>
          <FieldGroup>
            <FieldLabel htmlFor="medicalConditions">
              Medical Conditions
            </FieldLabel>
            <Input
              id="medicalConditions"
              placeholder="Any medical conditions"
              {...register("medicalConditions")}
            />
          </FieldGroup>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <FieldGroup>
            <FieldLabel htmlFor="emergencyContactName">
              Emergency Contact Name
            </FieldLabel>
            <Input
              id="emergencyContactName"
              placeholder="Contact person name"
              {...register("emergencyContactName")}
            />
          </FieldGroup>
          <FieldGroup>
            <FieldLabel htmlFor="emergencyContactPhone">
              Emergency Contact Phone
            </FieldLabel>
            <Input
              id="emergencyContactPhone"
              placeholder="+233 24 123 4567"
              {...register("emergencyContactPhone")}
            />
          </FieldGroup>
          <FieldGroup>
            <FieldLabel htmlFor="emergencyRelationship">
              Relationship
            </FieldLabel>
            <Input
              id="emergencyRelationship"
              placeholder="Mother, Father, Guardian..."
              {...register("emergencyRelationship")}
            />
          </FieldGroup>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          {studentProfileId ? "Update Student" : "Create Student"}
        </Button>
      </div>
    </form>
  );
}
