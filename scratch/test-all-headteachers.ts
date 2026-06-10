import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { getUserSchoolAccess, getPrimarySchool } from "../lib/auth/school-access";
import { getDefaultRoute } from "../lib/auth/route-resolver";
import { profileInclude, membershipInclude } from "../lib/auth/types";

async function main() {
  const { prisma } = await import("../lib/prisma");

  // Find all headteachers in members table
  const headteachers = await prisma.member.findMany({
    where: { role: "headteacher" },
    select: { userId: true }
  });

  console.log(`Found ${headteachers.length} headteachers in memberships.`);

  for (const ht of headteachers) {
    const userId = ht.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) continue;

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

    const access = getUserSchoolAccess(mockSession);
    const primary = getPrimarySchool(mockSession);
    const defaultRoute = getDefaultRoute(mockSession);

    console.log(`User: ${user.name} (${user.email})`);
    console.log(`  Access Length: ${access.length}`);
    if (access.length > 0) {
      console.log(`  Effective Role: ${access[0].effectiveRole}`);
    }
    console.log(`  Primary School subdomain: ${primary?.subdomain}`);
    console.log(`  Default Route: ${defaultRoute}`);
  }
}

main()
  .catch((e) => console.error(e));
