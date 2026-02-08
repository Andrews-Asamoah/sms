// components/school/students/student-form.tsx
// THIS FILE REPLACES YOUR EXISTING student-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import {
  Loader2,
  Save,
  User,
  MapPin,
  Heart,
  GraduationCap,
  Users,
  Plus,
  Trash2,
  Mail,
  Phone as PhoneIcon,
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const guardianSchema = z.object({
  firstName: z.string().min(2, "First name required"),
  lastName: z.string().min(2, "Last name required"),
  otherNames: z.string().optional().nullable(),
  email: z.string().email("Valid email required"),
  phone: z.string().min(10, "Phone number required"),
  alternatePhone: z.string().optional().nullable(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().nullable(),
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
  workAddress: z.string().optional().nullable(),
  workPhone: z.string().optional().nullable(),
  residentialAddress: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  isPrimary: z.boolean(),
  canPickup: z.boolean(),
  receiveReports: z.boolean(),
  receiveAlerts: z.boolean(),
});

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

  // Guardians - optional, only for new students
  guardians: z.array(guardianSchema).optional(),
});

type StudentFormValues = z.infer<typeof studentFormSchema>;

interface StudentFormProps {
  schoolId: string;
  schoolSlug: string;
  classes: Array<{ id: string; name: string; academicYear: { name: string } }>;
  departments: Array<{ id: string; name: string }>;
  houses: Array<{ id: string; name: string }>;
  suggestedStudentId: string;
  suggestedAdmissionNumber?: string;
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
  suggestedAdmissionNumber,
  initialData,
  studentProfileId,
}: StudentFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    defaultValues: initialData || {
      studentId: suggestedStudentId,
      admissionNumber: suggestedAdmissionNumber || "",
      nationality: "Ghanaian",
      country: "Ghana",
      admissionDate: new Date().toISOString().split("T")[0],
      gender: "MALE",
      guardians: [
        {
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          relationshipType: "FATHER",
          isPrimary: true,
          canPickup: true,
          receiveReports: true,
          receiveAlerts: true,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "guardians",
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
          description: studentProfileId
            ? `${data.firstName} ${data.lastName} has been updated.`
            : `${data.firstName} ${data.lastName} has been added.${!studentProfileId && data.guardians?.length ? ` Invitations sent to ${data.guardians.length} guardian(s).` : ""}`,
        },
      );

      router.push(
        `/${schoolSlug}/admin/students/${result.id || result.student?.id}`,
      );
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
              readOnly
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
              placeholder="ABC0001"
              {...register("admissionNumber")}
              readOnly
              className="bg-muted"
            />
            <p className="text-sm text-muted-foreground">
              Auto-generated based on school code
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

      {/* Guardians/Parents Section - Only show when creating new students */}
      {!isEditing && (
        <>
          <Separator />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">
                  Guardians/Parents Information
                </h3>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    firstName: "",
                    lastName: "",
                    otherNames: null,
                    email: "",
                    phone: "",
                    alternatePhone: null,
                    gender: null,
                    relationshipType: "MOTHER",
                    occupation: null,
                    employer: null,
                    workAddress: null,
                    workPhone: null,
                    residentialAddress: null,
                    city: null,
                    region: null,
                    isPrimary: false,
                    canPickup: true,
                    receiveReports: true,
                    receiveAlerts: true,
                  })
                }
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Guardian
              </Button>
            </div>

            {fields.map((field, index) => (
              <Card key={field.id} className="border-2">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      Guardian {index + 1}
                    </CardTitle>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                  <CardDescription>
                    An invitation email will be sent to this guardian
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Basic Info */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <FieldGroup>
                      <FieldLabel>First Name *</FieldLabel>
                      <Input
                        placeholder="John"
                        {...register(`guardians.${index}.firstName`)}
                      />
                      {errors.guardians?.[index]?.firstName && (
                        <FieldError>
                          {errors.guardians[index]?.firstName?.message}
                        </FieldError>
                      )}
                    </FieldGroup>
                    <FieldGroup>
                      <FieldLabel>Last Name *</FieldLabel>
                      <Input
                        placeholder="Doe"
                        {...register(`guardians.${index}.lastName`)}
                      />
                      {errors.guardians?.[index]?.lastName && (
                        <FieldError>
                          {errors.guardians[index]?.lastName?.message}
                        </FieldError>
                      )}
                    </FieldGroup>
                    <FieldGroup>
                      <FieldLabel>Other Names</FieldLabel>
                      <Input
                        placeholder="Middle name"
                        {...register(`guardians.${index}.otherNames`)}
                      />
                    </FieldGroup>
                  </div>

                  {/* Contact Info */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <FieldGroup>
                      <FieldLabel>
                        <Mail className="inline h-4 w-4 mr-1" />
                        Email *
                      </FieldLabel>
                      <Input
                        type="email"
                        placeholder="john.doe@email.com"
                        {...register(`guardians.${index}.email`)}
                      />
                      {errors.guardians?.[index]?.email && (
                        <FieldError>
                          {errors.guardians[index]?.email?.message}
                        </FieldError>
                      )}
                    </FieldGroup>
                    <FieldGroup>
                      <FieldLabel>
                        <PhoneIcon className="inline h-4 w-4 mr-1" />
                        Phone *
                      </FieldLabel>
                      <Input
                        placeholder="+233 24 123 4567"
                        {...register(`guardians.${index}.phone`)}
                      />
                      {errors.guardians?.[index]?.phone && (
                        <FieldError>
                          {errors.guardians[index]?.phone?.message}
                        </FieldError>
                      )}
                    </FieldGroup>
                    <FieldGroup>
                      <FieldLabel>Alternate Phone</FieldLabel>
                      <Input
                        placeholder="+233 20 987 6543"
                        {...register(`guardians.${index}.alternatePhone`)}
                      />
                    </FieldGroup>
                  </div>

                  {/* Relationship and Gender */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldGroup>
                      <FieldLabel>Relationship *</FieldLabel>
                      <Select
                        value={watch(`guardians.${index}.relationshipType`)}
                        onValueChange={(value) =>
                          setValue(
                            `guardians.${index}.relationshipType`,
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
                        <SelectTrigger>
                          <SelectValue />
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
                      {errors.guardians?.[index]?.relationshipType && (
                        <FieldError>
                          {errors.guardians[index]?.relationshipType?.message}
                        </FieldError>
                      )}
                    </FieldGroup>
                    <FieldGroup>
                      <FieldLabel>Gender</FieldLabel>
                      <Select
                        value={watch(`guardians.${index}.gender`) || ""}
                        onValueChange={(value) =>
                          setValue(
                            `guardians.${index}.gender`,
                            value as "MALE" | "FEMALE" | "OTHER",
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MALE">Male</SelectItem>
                          <SelectItem value="FEMALE">Female</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </FieldGroup>
                  </div>

                  {/* Occupation */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <FieldGroup>
                      <FieldLabel>Occupation</FieldLabel>
                      <Input
                        placeholder="Engineer"
                        {...register(`guardians.${index}.occupation`)}
                      />
                    </FieldGroup>
                    <FieldGroup>
                      <FieldLabel>Employer</FieldLabel>
                      <Input
                        placeholder="Company name"
                        {...register(`guardians.${index}.employer`)}
                      />
                    </FieldGroup>
                    <FieldGroup>
                      <FieldLabel>Work Phone</FieldLabel>
                      <Input
                        placeholder="+233 30 123 4567"
                        {...register(`guardians.${index}.workPhone`)}
                      />
                    </FieldGroup>
                  </div>

                  {/* Work Address */}
                  <FieldGroup>
                    <FieldLabel>Work Address</FieldLabel>
                    <Textarea
                      placeholder="Office address"
                      {...register(`guardians.${index}.workAddress`)}
                    />
                  </FieldGroup>

                  {/* Residential Address */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <FieldGroup className="md:col-span-2">
                      <FieldLabel>Residential Address</FieldLabel>
                      <Textarea
                        placeholder="Home address"
                        {...register(`guardians.${index}.residentialAddress`)}
                      />
                    </FieldGroup>
                    <div className="space-y-4">
                      <FieldGroup>
                        <FieldLabel>City</FieldLabel>
                        <Input
                          placeholder="Accra"
                          {...register(`guardians.${index}.city`)}
                        />
                      </FieldGroup>
                      <FieldGroup>
                        <FieldLabel>Region</FieldLabel>
                        <Input
                          placeholder="Greater Accra"
                          {...register(`guardians.${index}.region`)}
                        />
                      </FieldGroup>
                    </div>
                  </div>

                  {/* Permissions */}
                  <div className="space-y-3 pt-4 border-t">
                    <FieldLabel className="text-base font-semibold">
                      Permissions & Access
                    </FieldLabel>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`guardian-${index}-primary`}
                          checked={watch(`guardians.${index}.isPrimary`)}
                          onCheckedChange={(checked) =>
                            setValue(
                              `guardians.${index}.isPrimary`,
                              checked as boolean,
                            )
                          }
                        />
                        <label
                          htmlFor={`guardian-${index}-primary`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Primary Guardian
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`guardian-${index}-pickup`}
                          checked={watch(`guardians.${index}.canPickup`)}
                          onCheckedChange={(checked) =>
                            setValue(
                              `guardians.${index}.canPickup`,
                              checked as boolean,
                            )
                          }
                        />
                        <label
                          htmlFor={`guardian-${index}-pickup`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Can Pickup Student
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`guardian-${index}-reports`}
                          checked={watch(`guardians.${index}.receiveReports`)}
                          onCheckedChange={(checked) =>
                            setValue(
                              `guardians.${index}.receiveReports`,
                              checked as boolean,
                            )
                          }
                        />
                        <label
                          htmlFor={`guardian-${index}-reports`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Receive Reports
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`guardian-${index}-alerts`}
                          checked={watch(`guardians.${index}.receiveAlerts`)}
                          onCheckedChange={(checked) =>
                            setValue(
                              `guardians.${index}.receiveAlerts`,
                              checked as boolean,
                            )
                          }
                        />
                        <label
                          htmlFor={`guardian-${index}-alerts`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Receive Alerts
                        </label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

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
          {studentProfileId
            ? "Update Student"
            : "Create Student & Send Invitations"}
        </Button>
      </div>
    </form>
  );
}
