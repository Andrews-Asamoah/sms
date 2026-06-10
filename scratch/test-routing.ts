import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { getUserSchoolAccess, getPrimarySchool } from "../lib/auth/school-access";
import { getDefaultRoute } from "../lib/auth/route-resolver";
import { profileInclude, membershipInclude } from "../lib/auth/types";

async function main() {
  const { prisma } = await import("../lib/prisma");

  // Find a user who has a headteacher role in organization memberships
  const headteacherMembership = await prisma.member.findFirst({
    where: { role: "headteacher" },
    select: { userId: true }
  });

  if (!headteacherMembership) {
    console.log("No headteacher membership found in the DB.");
    return;
  }

  const userId = headteacherMembership.userId;
  console.log(`Testing user: ${userId}`);

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  const [profile, memberships] = await Promise.all([
    prisma.userProfile.findUnique({
      where: { userId },
      include: profileInclude,
    }),
    prisma.member.findMany({
      where: { userId },
      include: membershipInclude,
    }),
  ]);

  if (!user) {
    console.log("User record not found.");
    return;
  }

  const mockSession = {
    user: {
      ...user,
      role: user.role ?? "user",
      banned: (user as any).banned ?? false,
      banReason: (user as any).banReason ?? null,
      banExpires: (user as any).banExpires ?? null,
    },
    session: {
      id: "test-session",
      expiresAt: new Date(Date.now() + 100000),
      token: "test-token",
      createdAt: new Date(),
      updatedAt: new Date(),
      ipAddress: null,
      userAgent: null,
      impersonatedBy: null,
      userId,
      activeOrganizationId: memberships[0]?.organizationId ?? null,
    },
    profile,
    memberships,
    isSuperAdmin: user.role === "superAdmin",
    isAdmin: user.role === "superAdmin" || memberships.some(m => m.role === "owner" || m.role === "admin"),
    isOwner: memberships.some(m => m.role === "owner"),
    subscriptionStatus: "ACTIVE" as const,
  };

  console.log("\n=== mockSession.user ===");
  console.log(JSON.stringify(mockSession.user, null, 2));

  console.log("\n=== mockSession.memberships ===");
  console.log(JSON.stringify(mockSession.memberships, null, 2));

  console.log("\n=== mockSession.profile (summary) ===");
  console.log("Has profile:", !!profile);
  console.log("Has staff profile:", !!profile?.staff);
  if (profile?.staff) {
    console.log("Staff type:", profile.staff.staffType);
  }

  console.log("\n=== getUserSchoolAccess ===");
  const access = getUserSchoolAccess(mockSession);
  console.log(JSON.stringify(access, null, 2));

  console.log("\n=== getPrimarySchool ===");
  const primary = getPrimarySchool(mockSession);
  console.log(JSON.stringify(primary, null, 2));

  console.log("\n=== getDefaultRoute ===");
  const defaultRoute = getDefaultRoute(mockSession);
  console.log("Default route resolved to:", defaultRoute);
}

main()
  .catch((e) => console.error(e));
