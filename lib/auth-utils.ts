// lib/auth-utils.ts
import { auth } from "@/lib/auth";

interface CreateUserParams {
  email: string;
  password: string;
  name: string;
  schoolId: string; // Need schoolId to create user
}

interface CreateUserResult {
  user: {
    id: string;
    email: string;
    name: string;
    // emailVerified: boolean;
  };
}

/**
 * Create an admin user using Better Auth's admin plugin
 * Better Auth handles all password hashing automatically
 */
export async function createAuthUser(
  params: CreateUserParams
): Promise<CreateUserResult> {
  try {
    console.log("[AUTH_UTILS] Creating admin user:", params.email);

    // Use Better Auth admin plugin to create user
    // The admin plugin handles password hashing automatically
    const result = await auth.api.signUpEmail({
      body: {
        email: params.email,
        password: params.password,
        name: params.name,
        schoolId: params.schoolId, // Pass schoolId
      },
    });

    console.log("[AUTH_UTILS] User created successfully");

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        // emailVerified: user.emailVerified,
      },
    };
  } catch (error: any) {
    console.error("[CREATE_AUTH_USER_ERROR]", error);
    throw new Error(error.message || "Failed to create user account");
  }
}

export function verifyAuthConfig() {
  return true;
}
