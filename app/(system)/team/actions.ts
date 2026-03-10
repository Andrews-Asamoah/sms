"use server";

import { requireSuperAdmin } from "@/lib/auth/session";
import { auth } from "@/lib/auth";

export async function createCompanyMember(data: {
  name: string;
  email: string;
  password: string;
}) {
  try {
    await requireSuperAdmin();

    // Use Better Auth's admin API to create a new superAdmin user
    const result = await auth.api.createUser({
      body: {
        name: data.name,
        email: data.email,
        password: data.password,
        role: "superAdmin",
      },
    });

    if (!result || !result.user) {
      return { success: false, error: "Failed to create user." };
    }

    return { success: true, userId: result.user.id };
  } catch (error: any) {
    console.error("Error creating company member:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred.",
    };
  }
}
