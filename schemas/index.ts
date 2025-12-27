import * as z from "zod";

// Login schema
export const LoginSchema = z.object({
  email: z.string().email({ message: "Email is required" }),
  password: z.string().min(1, { message: "Password is required" }),
});

// User registration schema
export const RegisterUserSchema = z.object({
  email: z.string().email({ message: "Email is required" }),
  password: z
    .string()
    .min(6, { message: "Minimum of 6 characters is required" }),
  firstName: z.string().min(1, { message: "Firstname is required" }),
  lastName: z.string().min(1, { message: "Lastname is required" }),
  username: z.string(),
  otherNames: z.string(),
  phone: z.string(),
  dob: z.date({ required_error: "A date of birth is required" }),
  gender: z.string({ required_error: "Please select your gender" }),
  mothersName: z.string().optional(),
  mothersPhone: z.string().optional(),
  fathersName: z.string().optional(),
  fathersPhone: z.string().optional(),
  gurdiansName: z.string().optional(),
  gurdiansPhone: z.string().optional(),
  sectionId: z.string().optional(),
  classId: z.string().optional(),
  termId: z.string().optional(),
  subjectId: z.string().optional(),
  role: z.string({ required_error: "Please select a user Role" }),
  location: z.string().min(1, { message: "Location is required" }),
  image: z.string().optional(),
});

export const UpdateUserSchema = z.object({
  email: z.optional(z.string().email({ message: "Email is required" })),
  firstName: z.optional(
    z.string().min(1, { message: "Firstname is required" })
  ),
  lastName: z.optional(z.string().min(1, { message: "Lastname is required" })),
  otherNames: z.optional(z.string()),
  phone: z.optional(z.string()),
  dob: z.optional(z.date({ required_error: "A date of birth is required" })),
  role: z.string({ required_error: "Please select a user Role" }),
  image: z.optional(z.string()),
  gender: z.optional(z.string()),
  classId: z.string().optional(),
  mothersName: z.string().optional(),
  mothersPhone: z.string().optional(),
  fathersName: z.string().optional(),
  fathersPhone: z.string().optional(),
  gurdiansName: z.string().optional(),
  gurdiansPhone: z.string().optional(),
  location: z.optional(z.string().min(1, { message: "Location is required" })),
});

// Class Schemas
export const RegisterClassSchema = z.object({
  name: z.string().min(1, { message: "Class name is required" }),
  classTeacher: z.optional(
    z.string().min(1, { message: "Class teacher is required" })
  ),
});

export const UpdateClassSchema = z.object({
  name: z.optional(z.string().min(1, { message: "Class name is required" })),
  classTeacher: z.optional(
    z.string().min(1, { message: "Class teacher is required" })
  ),
  academicYearId: z.optional(
    z.string().min(1, { message: "Academic year ID is required" })
  ),
});

// Subject Schemas
export const RegisterSubjectSchema = z.object({
  name: z.string().min(1, { message: "Class name is required" }),
});

export const UpdateSubjectSchema = z.object({
  name: z.optional(z.string().min(1, { message: "Class name is required" })),
});

// Academic Year Schemas
export const CreateAcademicYearSchema = z
  .object({
    name: z.string().min(1, { message: "Academic Year name is required" }),
    date: z.object(
      {
        startDate: z.date(),
        endDate: z.date(),
      },
      { required_error: "Please select a date range" }
    ),
  })
  .refine((data) => data.date.endDate > data.date.startDate, {
    message: "End date cannot be earlier than Start date",
    path: ["endDate"],
  });

//
// Setup schema
//
export const setupBaseSchema = z.object({
  // School Information
  schoolName: z.string().min(3, "School name must be at least 3 characters"),
  schoolCode: z.string().optional(), // Make optional since it's auto-generated
  schoolEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  schoolPhone: z.string().optional(),
  // Admin Information
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain uppercase letter")
    .regex(/[a-z]/, "Must contain lowercase letter")
    .regex(/[0-9]/, "Must contain number")
    .regex(/[^A-Za-z0-9]/, "Must contain special character"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  gender: z.enum(["MALE", "FEMALE"], {
    required_error: "Please select a gender",
  }),
  dob: z
    .string()
    .min(1, "Please select your date of birth")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
});

export const setupFormSchema = setupBaseSchema.omit({ schoolCode: true });

export type SetupFormData = z.infer<typeof setupFormSchema>;
export type SetupApiData = z.infer<typeof setupBaseSchema>;
