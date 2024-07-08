"use server";
import bcrypt from "bcryptjs";

import * as z from "zod";

import { RegisterUserSchema } from "@/schemas";
import { prismadb } from "@/lib/db";
import { getUserByEmail, getUserByUsername } from "@/actions";
import { UserRole } from "@prisma/client";

export const register = async (values: z.infer<typeof RegisterUserSchema>) => {
  const validatedFields = RegisterUserSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Invalid Fields!" };
  }

  const {
    email,
    password,
    firstName,
    lastName,
    otherNames,
    gender,
    username,
    role,
    phone,
    location,
    fathersName,
    fathersPhone,
    mothersName,
    mothersPhone,
    gurdiansName,
    gurdiansPhone,
    sectionId,
    subjectId,
    classId,
    termId,
  } = validatedFields.data;

  // hash the password using bcrypt
  const hashedPassword = await bcrypt.hash(password, 10);

  // Automatically generate username (first letter of firstname + full lastname)
  const generatedUsername = `${firstName.charAt(0)}${lastName}`.toLowerCase();

  // check if the user already exists by email or username
  const existingUserByEmail = await getUserByEmail(email);
  const existingUserByUsername = await getUserByUsername(username);
  if (existingUserByEmail || existingUserByUsername) {
    return { error: "User already in exist!" };
  }

  // Create User
  const user = await prismadb.user.create({
    data: {
      email,
      firstName,
      lastName,
      otherNames,
      location,
      gender,
      phone,
      role: role as UserRole,
      username: generatedUsername,
      password: hashedPassword,
    },
  });

  // If role is STUDENT, create a student entry
  if (role === UserRole.STUDENT) {
    await prismadb.student.create({
      data: {
        userId: user.id,
        fathersName: fathersName || "",
        fathersPhone: fathersPhone || "",
        mothersName: mothersName || "",
        mothersPhone: mothersPhone || "",
        guardiansName: gurdiansName || "",
        guardiansPhone: gurdiansPhone || "",
      },
    });
  }
  return { success: "user account created successfully! " };
};
