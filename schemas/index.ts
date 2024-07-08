import * as z from "zod";

export const LoginSchema = z.object({
  email: z.string().email({ message: "Email is required" }),
  password: z.string().min(1, { message: "Password is required" }),
});

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
  role: z.string({ required_error: "Please select a user Role" }),
  image: z.optional(z.string()),
  location: z.optional(z.string().min(1, { message: "Location is required" })),
});
