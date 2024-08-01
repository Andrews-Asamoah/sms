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
