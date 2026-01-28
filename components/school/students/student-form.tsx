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
  admissionNumber: z.string().optional().nullable(),
  admissionDate: z.string().min(1, "Admission date is required"),
  classId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  houseId: z.string().optional().nullable(),

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
  houses: Array<{ id: string; name: string }>;
  suggestedStudentId: string;
  initialData?: Partial<StudentFormValues>;
  studentProfileId?: string;
}

export function StudentForm({
  schoolId,
  schoolSlug,
  classes,
  departments,
  houses,
  suggestedStudentId,
  initialData,
  studentProfileId,
}: StudentFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: initialData || {
      studentId: suggestedStudentId,
      nationality: "Ghanaian",
      country: "Ghana",
      admissionDate: new Date().toISOString().split("T")[0],
      gender: "MALE",
    },
  });

  async function onSubmit(data: StudentFormValues) {
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

      toast.success(
        studentProfileId
          ? "Student updated successfully"
          : "Student created successfully",
        {
          description: `${data.firstName} ${data.lastName} has been ${studentProfileId ? "updated" : "added"}.`,
        }
      );

      router.push(`/${schoolSlug}/admin/students/${result.id}`);
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
              placeholder="STU00001"
              {...register("studentId")}
              readOnly={!!studentProfileId}
            />
            <p className="text-sm text-muted-foreground">
              Auto-generated unique identifier
            </p>
            {errors.studentId && (
              <FieldError>{errors.studentId.message}</FieldError>
            )}
          </FieldGroup>

          <FieldGroup>
            <FieldLabel htmlFor="admissionNumber">Admission Number</FieldLabel>
            <Input
              id="admissionNumber"
              placeholder="ADM2024001"
              {...register("admissionNumber")}
            />
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

        <div className="grid gap-4 md:grid-cols-3">
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

          <FieldGroup>
            <FieldLabel htmlFor="departmentId">Department</FieldLabel>
            <Select
              value={watch("departmentId") || ""}
              onValueChange={(value) => setValue("departmentId", value)}
            >
              <SelectTrigger id="departmentId">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldGroup>

          <FieldGroup>
            <FieldLabel htmlFor="houseId">House</FieldLabel>
            <Select
              value={watch("houseId") || ""}
              onValueChange={(value) => setValue("houseId", value)}
            >
              <SelectTrigger id="houseId">
                <SelectValue placeholder="Select house" />
              </SelectTrigger>
              <SelectContent>
                {houses.map((house) => (
                  <SelectItem key={house.id} value={house.id}>
                    {house.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldGroup>
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
