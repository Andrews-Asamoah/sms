import * as dotenv from "dotenv";
import * as path from "path";

// Load dotenv before importing anything else
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Log database URL length for confirmation
console.log("DATABASE_URL length:", process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 0);

async function main() {
  // Dynamically import prisma to ensure environment variables are loaded first
  const { prisma } = await import("../lib/prisma");

  console.log("=== USERS ===");
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    }
  });
  console.log(JSON.stringify(users, null, 2));

  console.log("\n=== MEMBERSHIPS ===");
  const members = await prisma.member.findMany({
    select: {
      id: true,
      userId: true,
      organizationId: true,
      role: true,
    }
  });
  console.log(JSON.stringify(members, null, 2));

  console.log("\n=== STAFF ===");
  const staff = await prisma.staff.findMany({
    select: {
      id: true,
      profileId: true,
      staffType: true,
      isActive: true,
    }
  });
  console.log(JSON.stringify(staff, null, 2));
}

main()
  .catch((e) => console.error(e));
