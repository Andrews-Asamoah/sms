// types/auth.d.ts (create this file)
import type { UserRole } from "@prisma/client";

declare module "better-auth/types" {
  interface User {
    schoolId: string;
    role: UserRole;
    roles: UserRole[];
    isSuperAdmin: boolean;
  }

  interface Session {
    user: User & {
      id: string;
      name: string;
      email: string;
      emailVerified: boolean;
      image: string | null;
      createdAt: Date;
      updatedAt: Date;
      schoolId: string;
      role?: UserRole;
      roles?: UserRole[];
      isSuperAdmin?: boolean;
    };
  }
}
