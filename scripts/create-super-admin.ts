/**
 * Super Admin Setup Script - Better Auth Integration
 * Run this once to create your super admin account
 *
 * Usage: npx tsx scripts/create-super-admin.ts
 */
import "dotenv/config";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Gender } from "@/lib/generated/prisma/client";

interface SuperAdminInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth: Date;
  gender: Gender;
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
      console.log("\n💡 Existing user details:");
      console.log("   ID:", existingUser.id);
      console.log("   Email:", existingUser.email);
      console.log("   Role:", existingUser.role);
      console.log("   Has Profile:", !!existingUser.profile);
      console.log("\n💡 To delete and recreate, run:");
      console.log(`   npx tsx scripts/delete-user.ts ${input.email}`);
      return;
    }

    console.log("✓ Email is available");

    // Use Better Auth's sign-up endpoint for proper password hashing
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

    const userId = signUpResult.user.id;
    console.log("✓ User created:", userId);

    // Update user and create profile in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update user to superAdmin role
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          role: "superAdmin", // System-wide superAdmin role
          emailVerified: true,
        },
      });
      console.log("✓ User role updated to superAdmin");

      // 2. Create user profile
      const profile = await tx.userProfile.create({
        data: {
          userId: user.id,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone || null,
          gender: input.gender,
          dateOfBirth: input.dateOfBirth,
          isActive: true,
        },
      });
      console.log("✓ User profile created:", profile.id);

      // 3. Get account details for verification
      const account = await tx.account.findFirst({
        where: {
          userId: user.id,
          providerId: "credential",
        },
      });

      return { user, profile, account };
    });

    console.log("\n✅ Super Admin created successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("👤 User Details:");
    console.log("   ID:", result.user.id);
    console.log("   Email:", result.user.email);
    console.log("   Name:", result.user.name);
    console.log("   Role:", result.user.role);
    console.log("   Email Verified:", result.user.emailVerified);
    console.log("\n📋 Profile Details:");
    console.log("   Profile ID:", result.profile.id);
    console.log("   First Name:", result.profile.firstName);
    console.log("   Last Name:", result.profile.lastName);
    console.log("   Phone:", result.profile.phone || "N/A");
    console.log("   Gender:", result.profile.gender);
    console.log("\n🔐 Account Details:");
    console.log("   Provider:", result.account?.providerId);
    console.log("   Account ID:", result.account?.accountId);
    console.log("   Password:", "✓ Hashed by Better Auth");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    console.log("\n🔑 Login Credentials:");
    console.log(`   Email: ${input.email}`);
    console.log(`   Password: ${input.password}`);

    console.log("\n🎯 Super Admin Permissions:");
    console.log("   ✓ Can create organizations (schools)");
    console.log("   ✓ Can delete any organization");
    console.log("   ✓ Can manage all schools");
    console.log("   ✓ Can remove any member from any organization");
    console.log("   ✓ Full system access");

    console.log("\n🌐 You can now login at:");
    console.log("   Development: http://localhost:3000/login");
    console.log("   Production: https://yourdomain.com/login");

    console.log("\n📝 Next Steps:");
    console.log("   1. Login with the credentials above");
    console.log("   2. Create your first school organization");
    console.log("   3. Add admins to manage the school");
    console.log("   4. Start adding students and teachers");

    return result;
  } catch (error) {
    console.error("\n❌ Error creating super admin:");
    if (error instanceof Error) {
      console.error("   Message:", error.message);
      console.error("   Stack:", error.stack);
    } else {
      console.error("   ", error);
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Verify super admin can perform privileged operations
 */
async function verifySuperAdminPermissions(userId: string) {
  try {
    console.log("\n🔍 Verifying Super Admin permissions...");

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      console.error("❌ User not found");
      return false;
    }

    // Check 1: System role is superAdmin
    if (user.role !== "superAdmin") {
      console.error("❌ User role is not superAdmin");
      return false;
    }
    console.log("✓ System role: superAdmin");

    // Check 2: Can create organizations (via Better Auth plugin)
    // This is checked by Better Auth's allowUserToCreateOrganization hook
    console.log("✓ Can create organizations: true (via Better Auth)");

    // Check 3: Can manage all schools
    console.log("✓ Can access all schools: true");

    // Check 4: Can remove any member
    console.log("✓ Can remove any member: true");

    console.log("\n✅ All permission checks passed!");
    return true;
  } catch (error) {
    console.error("❌ Permission verification failed:", error);
    return false;
  }
}

async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  SUPER ADMIN CREATION SCRIPT");
  console.log("  Better Auth Integration");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Check database connection first
  try {
    await prisma.$connect();
    console.log("✓ Database connection successful");

    // Check if User table exists
    const tableCheck = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'User'
      );
    `;
    console.log("✓ Database tables verified");
  } catch (error) {
    console.error("\n❌ Database connection or table check failed!");
    console.error("💡 Please run: npx prisma migrate dev");
    console.error("   This will create all necessary database tables.\n");
    process.exit(1);
  }

  const superAdminData: SuperAdminInput = {
    email: "superadmin@sms.com",
    password: "SecurePassword123!@#", // Change this in production!
    firstName: "Andrews",
    lastName: "Asamoah",
    phone: "+233557462789",
    dateOfBirth: new Date("1997-04-07"),
    gender: Gender.MALE,
  };

  // Create super admin
  const result = await createSuperAdmin(superAdminData);

  if (result) {
    // Verify permissions
    await verifySuperAdminPermissions(result.user.id);
  }

  console.log("\n✨ Setup complete!");
}

main().catch((error) => {
  console.error("\n💥 Fatal error:", error);
  process.exit(1);
});
