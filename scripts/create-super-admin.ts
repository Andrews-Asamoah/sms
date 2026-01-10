/**
 * Super Admin Setup Script - Using Better Auth Sign Up API
 * Run this once to create your super admin account
 *
 * Usage: npx tsx scripts/create-super-admin.ts
 */
import "dotenv/config";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

interface SuperAdminInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth: Date;
  gender: "MALE" | "FEMALE" | "OTHER";
}

async function createSuperAdmin(input: SuperAdminInput) {
  try {
    console.log("🚀 Creating Super Admin account...");
    console.log("📧 Email:", input.email);

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
      include: {
        accounts: true,
        profile: true,
      },
    });

    if (existingUser) {
      console.error("❌ User with this email already exists");
      console.log("\n💡 To delete and recreate, run:");
      console.log(`   npx tsx scripts/delete-user.ts ${input.email}`);
      return;
    }

    // Use Better Auth's sign-up endpoint to create user with proper password hashing
    console.log("✓ Creating user via Better Auth API...");

    const signUpResult = await auth.api.signUpEmail({
      body: {
        email: input.email,
        password: input.password,
        name: `${input.firstName} ${input.lastName}`,
      },
    });

    if (!signUpResult || !signUpResult.user) {
      throw new Error("Failed to create user via Better Auth");
    }

    console.log("✓ User and account created:", signUpResult.user.id);

    // Update user role to superAdmin and create profile
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update user role to superAdmin
      const user = await tx.user.update({
        where: { id: signUpResult.user.id },
        data: {
          role: "superAdmin",
          emailVerified: true,
        },
      });
      console.log("✓ User role updated to superAdmin");

      // 2. Fix accountId if needed (Better Auth might set it to user.id)
      const account = await tx.account.findFirst({
        where: { userId: user.id, providerId: "credential" },
      });

      if (account && account.accountId !== input.email) {
        console.log(
          `⚠️  Fixing accountId from "${account.accountId}" to "${input.email}"`
        );
        await tx.account.update({
          where: { id: account.id },
          data: { accountId: input.email },
        });
        console.log("✓ Account accountId fixed");
      }

      // 3. Create user profile
      const profile = await tx.userProfile.create({
        data: {
          userId: user.id,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          gender: input.gender,
          dateOfBirth: input.dateOfBirth,
          isSuperAdmin: true,
          isActive: true,
        },
      });
      console.log("✓ Profile created:", profile.id);

      // 4. Get updated account info
      const updatedAccount = await tx.account.findFirst({
        where: { userId: user.id },
      });

      return { user, account: updatedAccount, profile };
    });

    console.log("\n✅ Super Admin created successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📧 Email:", result.user.email);
    console.log("👤 Name:", result.user.name);
    console.log("🎭 Role:", result.user.role);
    console.log("🔑 User ID:", result.user.id);
    console.log("🔐 Account ID:", result.account?.accountId);
    console.log("🔐 Provider ID:", result.account?.providerId);
    console.log("✓ Is Super Admin:", result.profile.isSuperAdmin);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Verify the account
    console.log("\n🔍 Verifying account...");
    const verifyAccount = await prisma.account.findUnique({
      where: {
        providerId_accountId: {
          providerId: "credential",
          accountId: input.email,
        },
      },
    });

    if (verifyAccount) {
      console.log("✓ Account verified in database");
      console.log("✓ Password hash created by Better Auth");
    } else {
      console.error("⚠️  Account not found with unique lookup!");
    }

    console.log("\n🔐 Login Credentials:");
    console.log(`   Email: ${input.email}`);
    console.log(`   Password: ${input.password}`);
    console.log("\n🌐 You can now login at: http://localhost:3000/login");

    return result;
  } catch (error) {
    console.error("❌ Error creating super admin:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const superAdminData: SuperAdminInput = {
    email: "superadmin@sms.com",
    password: "3Vpanw6@...",
    firstName: "Andrews",
    lastName: "Asamoah",
    phone: "+233557462789",
    dateOfBirth: new Date("1997-04-07"),
    gender: "MALE",
  };

  await createSuperAdmin(superAdminData);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
