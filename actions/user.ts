"use server";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import * as z from "zod";

import { RegisterUserSchema, UpdateUserSchema } from "@/schemas";
import { prismadb } from "@/lib/prisma";
import { getUserByEmail, getUserByUsername } from "@/actions";
import { Gender, UserRole } from "@prisma/client";

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
    dob,
    classId,
    sectionId,
    subjectId,
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
      dob: dob,
      gender: gender as Gender,
      phone,
      role: role as UserRole,
      username: generatedUsername,
      password: hashedPassword,
    },
  });

  // If role is STUDENT, create a student entry
  if (role === UserRole.STUDENT) {
    try {
      await prismadb.student.create({
        data: {
          userId: user.id,
          classId: classId || null,
          fathersName: fathersName || "",
          fathersPhone: fathersPhone || "",
          mothersName: mothersName || "",
          mothersPhone: mothersPhone || "",
          guardiansName: gurdiansName || "",
          guardiansPhone: gurdiansPhone || "",
        },
      });
    } catch (error) {
      return { error: "Failed to create Student record!" };
    }
  }
  return { success: "user account created successfully! " };
};

export async function deleteUser(id: string) {
  try {
    const user = await prismadb.user.deleteMany({ where: { id } });

    if (!user) {
      throw new Error("User not found");
    }
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    } else {
      return {
        error: "An unknown error occurred while deleting User",
      };
    }
  }
}

export const updateUser = async (
  id: string | undefined,
  values: z.infer<typeof UpdateUserSchema>
) => {
  const validatedFields = UpdateUserSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Invalid Fields!" };
  }
  const {
    email,
    firstName,
    lastName,
    otherNames,
    phone,
    location,
    role,
    classId,
    dob,
    fathersName,
    fathersPhone,
    mothersName,
    mothersPhone,
    gurdiansName,
    gurdiansPhone,
  } = validatedFields.data;

  // Automatically generate username (first letter of firstname + full lastname)
  const generatedUsername = `${firstName?.charAt(0)}${lastName}`.toLowerCase();

  const user = await prismadb.user.update({
    where: { id },
    data: {
      email,
      firstName,
      lastName,
      otherNames,
      phone,
      location,
      dob,
      role: role as UserRole,
    },
  });

  // If role is STUDENT, create a student entry
  if (role === UserRole.STUDENT) {
    try {
      await prismadb.student.update({
        where: { userId: id },
        data: {
          classId: classId,
          fathersName: fathersName || "",
          fathersPhone: fathersPhone || "",
          mothersName: mothersName || "",
          mothersPhone: mothersPhone || "",
          guardiansName: gurdiansName || "",
          guardiansPhone: gurdiansPhone || "",
        },
      });
    } catch (error) {
      return { error: "Failed to update Student record!" };
    }
  }
  return { success: "user account updated successfully! " };
};
