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

// ============================================================================
// MAIN CREATION FUNCTION
// ============================================================================

async function createSuperAdmin(input: SuperAdminInput) {
  try {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🚀 Creating Super Admin Account");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("📧 Email:", input.email);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
      include: {
        profile: true,
      },
    });

    if (existingUser) {
      console.error("❌ User with this email already exists\n");
      console.log("💡 Existing user details:");
      console.log("   ID:", existingUser.id);
      console.log("   Email:", existingUser.email);
      console.log("   Has Profile:", !!existingUser.profile);
      console.log("\n💡 To update to superAdmin role, run:");
      console.log(
        `   UPDATE users SET role = 'superAdmin' WHERE email = '${input.email}';`,
      );
      return null;
    }

    console.log("✅ Email is available\n");

    // Use Better Auth's sign-up API to create user with hashed password
    console.log("🔐 Creating user with Better Auth API...");

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
    console.log("✅ User created:", userId);

    // Update user and create profile in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update user to superAdmin role and verify email
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          emailVerified: true,
        },
      });

      console.log("✅ Email verified for user");

      // Create user profile
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

      console.log("✅ User profile created:", profile.id);

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "CREATE",
          entityType: "SUPER_ADMIN",
          entityId: user.id,
          newValues: {
            email: user.email,
            createdAt: new Date(),
          },
        },
      });

      console.log("✅ Audit log created\n");

      return { user, profile };
    });

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ SUPER ADMIN CREATED SUCCESSFULLY!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("👤 User Details:");
    console.log("   ID:", result.user.id);
    console.log("   Email:", result.user.email);
    console.log("   Name:", result.user.name);
    console.log("   Email Verified:", result.user.emailVerified);

    console.log("\n📋 Profile Details:");
    console.log("   Profile ID:", result.profile.id);
    console.log("   First Name:", result.profile.firstName);
    console.log("   Last Name:", result.profile.lastName);
    console.log("   Phone:", result.profile.phone || "N/A");
    console.log("   Gender:", result.profile.gender);
    console.log(
      "   Date of Birth:",
      result.profile.dateOfBirth.toLocaleDateString(),
    );

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔑 LOGIN CREDENTIALS");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Email:    ${input.email}`);
    console.log(`Password: ${input.password}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("🎯 Super Admin Capabilities:");
    console.log("   ✅ Can create organizations (schools)");
    console.log("   ✅ Can manage all schools");
    console.log("   ✅ Full system access");

    console.log("\n🌐 Login URL:");
    console.log("   http://localhost:3000/login");

    return result;
  } catch (error) {
    console.error("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("❌ ERROR CREATING SUPER ADMIN");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    if (error instanceof Error) {
      console.error("Message:", error.message);
      console.error("\nStack Trace:");
      console.error(error.stack);
    } else {
      console.error("Unknown error:", error);
    }

    throw error;
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log("\n");
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║                                                            ║");
  console.log("║          SUPER ADMIN CREATION SCRIPT                       ║");
  console.log("║                                                            ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("\n");

  // Check database connection
  try {
    await prisma.$connect();
    console.log("✅ Database connection successful\n");
  } catch (error) {
    console.error("❌ Database connection failed!");
    console.error("Error:", error);
    console.error("\n💡 Please check:");
    console.error("   1. DATABASE_URL is set in .env");
    console.error("   2. PostgreSQL is running");
    console.error("   3. Run: npx prisma migrate dev\n");
    process.exit(1);
  }

  // Super Admin configuration
  const superAdminData: SuperAdminInput = {
    email: "kasamoah715@gmail.com",
    password: "3Vpanw6@...", // ⚠️ CHANGE THIS!
    firstName: "Andrews",
    lastName: "Asamoah",
    phone: "+233557462789",
    dateOfBirth: new Date("1997-04-07"),
    gender: Gender.MALE,
  };

  const result = await createSuperAdmin(superAdminData);

  if (!result) {
    console.log("\n⚠️  Creation skipped or failed");
    process.exit(1);
  }

  console.log("\n✨ Setup complete!\n");
  await prisma.$disconnect();
}

main()
  .catch((error) => {
    console.error("\n💥 Fatal error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
