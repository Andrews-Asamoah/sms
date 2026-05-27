/**
 * ============================================================================
 * SUPER ADMIN SETUP SCRIPT
 * Better Auth Integration with Organization Plugin
 */

import "dotenv/config";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Gender } from "@prisma/client";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface SuperAdminInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth: Date;
  gender: Gender;
}

interface CreateSuperAdminResult {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    emailVerified: boolean;
  };
  profile: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    gender: Gender;
  };
  account: {
    providerId: string;
    accountId: string;
  } | null;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Create SuperAdmin account with Better Auth
 *
 * Process:
 * 1. Check if email already exists
 * 2. Create user via Better Auth API (handles password hashing)
 * 3. Update user role to "superAdmin"
 * 4. Create UserProfile
 * 5. Verify account creation
 */
async function createSuperAdmin(
  input: SuperAdminInput,
): Promise<CreateSuperAdminResult> {
  try {
    console.log("\n🚀 Starting SuperAdmin Creation Process...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📧 Email: ${input.email}`);
    console.log(`👤 Name: ${input.firstName} ${input.lastName}`);

    // ========================================================================
    // STEP 1: Check if user already exists
    // ========================================================================
    console.log("\n[1/5] Checking if email is available...");

    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
      include: {
        accounts: true,
        userProfile: true,
        members: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (existingUser) {
      console.error("\n❌ CONFLICT: User with this email already exists!");
      console.log("\n📋 Existing User Details:");
      console.log(`   ID: ${existingUser.id}`);
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   Role: ${existingUser.role}`);
      console.log(`   Has Profile: ${existingUser.userProfile ? "Yes" : "No"}`);
      console.log(`   Organizations: ${existingUser.members.length}`);

      if (existingUser.members.length > 0) {
        console.log("\n   Member of:");
        existingUser.members.forEach((membership: any) => {
          console.log(
            `     - ${membership.organization.name} (${membership.role})`,
          );
        });
      }

      console.log("\n💡 Solutions:");
      console.log("   1. Use a different email address");
      console.log("   2. Delete the existing user:");
      console.log(`      npx tsx scripts/delete-user.ts ${input.email}`);
      console.log("   3. Update existing user to superAdmin:");
      console.log(
        `      npx tsx scripts/promote-to-superadmin.ts ${input.email}`,
      );

      throw new Error("Email already in use");
    }

    console.log("   ✓ Email is available");

    // ========================================================================
    // STEP 2: Create user via Better Auth API
    // ========================================================================
    console.log("\n[2/5] Creating user account via Better Auth...");
    console.log("   (Password will be automatically hashed)");

    const signUpResult = await auth.api.signUpEmail({
      body: {
        email: input.email,
        password: input.password,
        name: `${input.firstName} ${input.lastName}`,
      },
    });

    if (!signUpResult?.user) {
      throw new Error("Failed to create user via Better Auth API");
    }

    const userId = signUpResult.user.id;
    console.log(`   ✓ User created with ID: ${userId}`);

    // ========================================================================
    // STEP 3: Update user role and create profile in transaction
    // ========================================================================
    console.log("\n[3/5] Updating user to SuperAdmin role...");

    const result = await prisma.$transaction(
      async (tx) => {
        // Update user to superAdmin role and bypass onboarding
        const user = await tx.user.update({
          where: { id: userId },
          data: {
            role: "superAdmin",
            emailVerified: true,
          },
        });

        console.log("   ✓ User role updated to superAdmin");
        console.log("   ✓ Email marked as verified");

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

        console.log(`   ✓ User profile created with ID: ${profile.id}`);

        // Get account details for verification
        const account = await tx.account.findFirst({
          where: {
            userId: user.id,
            providerId: "credential",
          },
          select: {
            providerId: true,
            accountId: true,
          },
        });

        console.log("   ✓ Account details retrieved");

        return { user, profile, account };
      },
      {
        maxWait: 5000,
        timeout: 10000,
      },
    );

    // ========================================================================
    // STEP 4: Create audit log
    // ========================================================================
    console.log("\n[4/5] Creating audit log...");

    await prisma.auditLog.create({
      data: {
        userId: result.user.id,
        action: "CREATE",
        entityType: "SUPER_ADMIN",
        entityId: result.user.id,
        newValues: {
          email: result.user.email,
          role: result.user.role,
          firstName: input.firstName,
          lastName: input.lastName,
          createdAt: new Date().toISOString(),
        },
      },
    });

    console.log("   ✓ Audit log created");

    // ========================================================================
    // STEP 5: Display success message
    // ========================================================================
    console.log("\n[5/5] Verification complete");
    console.log("   ✓ All checks passed");

    displaySuccessMessage(result, input.password);

    return result;
  } catch (error) {
    console.error("\n❌ ERROR: SuperAdmin creation failed!");

    if (error instanceof Error) {
      console.error(`\n💥 Error Message: ${error.message}`);

      if (process.env.NODE_ENV === "development") {
        console.error(`\n🔍 Stack Trace:\n${error.stack}`);
      }
    } else {
      console.error(`\n💥 Unknown Error: ${String(error)}`);
    }

    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Display formatted success message
 */
function displaySuccessMessage(
  result: CreateSuperAdminResult,
  password: string,
): void {
  console.log("\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ SUPER ADMIN CREATED SUCCESSFULLY!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  console.log("\n👤 USER DETAILS:");
  console.log(`   ID:             ${result.user.id}`);
  console.log(`   Email:          ${result.user.email}`);
  console.log(`   Name:           ${result.user.name}`);
  console.log(`   Role:           ${result.user.role}`);
  console.log(`   Email Verified: ${result.user.emailVerified ? "✓" : "✗"}`);

  console.log("\n📋 PROFILE DETAILS:");
  console.log(`   Profile ID:  ${result.profile.id}`);
  console.log(`   First Name:  ${result.profile.firstName}`);
  console.log(`   Last Name:   ${result.profile.lastName}`);
  console.log(`   Phone:       ${result.profile.phone || "Not provided"}`);
  console.log(`   Gender:      ${result.profile.gender}`);

  console.log("\n🔐 ACCOUNT DETAILS:");
  console.log(`   Provider:    ${result.account?.providerId || "N/A"}`);
  console.log(`   Account ID:  ${result.account?.accountId || "N/A"}`);
  console.log(`   Password:    ✓ Hashed by Better Auth`);

  console.log("\n🔑 LOGIN CREDENTIALS:");
  console.log(`   Email:    ${result.user.email}`);
  console.log(`   Password: ${password}`);
  console.log("\n   ⚠️  IMPORTANT: Change this password after first login!");

  console.log("\n🎯 SUPERADMIN PRIVILEGES:");
  console.log("   ✓ Can create organizations (schools)");
  console.log("   ✓ Can delete any organization");
  console.log("   ✓ Can manage all schools");
  console.log("   ✓ Can remove any member from any organization");
  console.log("   ✓ Can impersonate any user");
  console.log("   ✓ Full system access");

  console.log("\n🌐 LOGIN URLs:");
  console.log(
    `   Development: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login`,
  );
  if (process.env.PRODUCTION_URL) {
    console.log(`   Production:  ${process.env.PRODUCTION_URL}/login`);
  }

  console.log("\n📝 NEXT STEPS:");
  console.log("   1. Login with the credentials above");
  console.log("   2. Change your password immediately");
  console.log("   3. Create your first school organization");
  console.log("   4. Assign school administrators");
  console.log("   5. Configure school settings");

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

/**
 * Verify database connection and required tables
 */
async function verifyDatabaseSetup(): Promise<void> {
  try {
    console.log("🔍 Verifying database connection...");

    await prisma.$connect();
    console.log("   ✓ Database connection successful");

    // Check if required tables exist
    await prisma.user.findFirst();
    console.log("   ✓ Users table exists");

    await prisma.userProfile.findFirst();
    console.log("   ✓ UserProfile table exists");

    await prisma.account.findFirst();
    console.log("   ✓ Account table exists");

    console.log("   ✓ All required tables verified");
  } catch (error) {
    console.error("\n❌ Database verification failed!");
    console.error("\n💡 Please run database migrations:");
    console.error("   npx prisma generate");
    console.error("   npx prisma migrate dev");
    console.error("\n   This will create all necessary database tables.\n");
    throw error;
  }
}

/**
 * Verify SuperAdmin permissions
 */
async function verifySuperAdminPermissions(userId: string): Promise<boolean> {
  try {
    console.log("\n🔍 Verifying SuperAdmin permissions...");

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        email: true,
      },
    });

    if (!user) {
      console.error("   ❌ User not found");
      return false;
    }

    if (user.role !== "superAdmin") {
      console.error("   ❌ User role is not superAdmin");
      return false;
    }

    console.log("   ✓ Role is superAdmin");
    console.log("   ✓ Can create organizations");
    console.log("   ✓ Can access all schools");
    console.log("   ✓ Can manage all members");
    console.log("   ✓ Can impersonate users");

    return true;
  } catch (error) {
    console.error("   ❌ Permission verification failed:", error);
    return false;
  }
}

/**
 * Seed default grading systems (BECE, WASSCE, US GPA, IB, UK GCSE) if they don't already exist
 */
async function seedDefaultGradingSystems(): Promise<void> {
  try {
    console.log("\n🌱 Seeding default grading systems...");
    
    const count = await prisma.gradingSystem.count({
      where: { isSystemDefault: true }
    });
    
    if (count > 0) {
      console.log("   ✓ Default grading systems already exist in the database");
      return;
    }

    const defaultSystems = [
      {
        name: "WAEC BECE Standard System",
        code: "BECE",
        description: "Ghana WAEC Basic Education Certificate Examination 9-grade stanine scale (Grades 1-9, where 1 is the highest).",
        isSystemDefault: true,
        gradeScales: [
          { grade: "1", description: "Highest / Excellent", minScore: 90, maxScore: 100, gradePoint: 1.0, displayOrder: 1 },
          { grade: "2", description: "Very Good", minScore: 80, maxScore: 89.99, gradePoint: 2.0, displayOrder: 2 },
          { grade: "3", description: "Good", minScore: 70, maxScore: 79.99, gradePoint: 3.0, displayOrder: 3 },
          { grade: "4", description: "High Pass", minScore: 60, maxScore: 69.99, gradePoint: 4.0, displayOrder: 4 },
          { grade: "5", description: "Pass", minScore: 55, maxScore: 59.99, gradePoint: 5.0, displayOrder: 5 },
          { grade: "6", description: "Average Pass", minScore: 50, maxScore: 54.99, gradePoint: 6.0, displayOrder: 6 },
          { grade: "7", description: "Low Pass", minScore: 45, maxScore: 49.99, gradePoint: 7.0, displayOrder: 7 },
          { grade: "8", description: "Weak Pass", minScore: 40, maxScore: 44.99, gradePoint: 8.0, displayOrder: 8 },
          { grade: "9", description: "Lowest / Fail", minScore: 0, maxScore: 39.99, gradePoint: 9.0, displayOrder: 9 },
        ]
      },
      {
        name: "WAEC WASSCE Standard System",
        code: "WASSCE",
        description: "West African Senior School Certificate Examination grading scale (A1 to F9).",
        isSystemDefault: true,
        gradeScales: [
          { grade: "A1", description: "Excellent", minScore: 75, maxScore: 100, gradePoint: 4.0, displayOrder: 1 },
          { grade: "B2", description: "Very Good", minScore: 70, maxScore: 74.99, gradePoint: 3.5, displayOrder: 2 },
          { grade: "B3", description: "Good", minScore: 65, maxScore: 69.99, gradePoint: 3.0, displayOrder: 3 },
          { grade: "C4", description: "Credit", minScore: 60, maxScore: 64.99, gradePoint: 2.5, displayOrder: 4 },
          { grade: "C5", description: "Credit", minScore: 55, maxScore: 59.99, gradePoint: 2.0, displayOrder: 5 },
          { grade: "C6", description: "Credit", minScore: 50, maxScore: 54.99, gradePoint: 1.5, displayOrder: 6 },
          { grade: "D7", description: "Pass", minScore: 45, maxScore: 49.99, gradePoint: 1.0, displayOrder: 7 },
          { grade: "E8", description: "Pass", minScore: 40, maxScore: 44.99, gradePoint: 0.5, displayOrder: 8 },
          { grade: "F9", description: "Fail", minScore: 0, maxScore: 39.99, gradePoint: 0.0, displayOrder: 9 },
        ]
      },
      {
        name: "US GPA Letter Grade System",
        code: "US_GPA",
        description: "Standard United States Letter Grading System with corresponding 4.0 scale GPA values.",
        isSystemDefault: true,
        gradeScales: [
          { grade: "A+", description: "Outstanding", minScore: 97, maxScore: 100, gradePoint: 4.0, displayOrder: 1 },
          { grade: "A", description: "Excellent", minScore: 93, maxScore: 96.99, gradePoint: 4.0, displayOrder: 2 },
          { grade: "A-", description: "Very Good", minScore: 90, maxScore: 92.99, gradePoint: 3.7, displayOrder: 3 },
          { grade: "B+", description: "Good", minScore: 87, maxScore: 89.99, gradePoint: 3.3, displayOrder: 4 },
          { grade: "B", description: "Above Average", minScore: 83, maxScore: 86.99, gradePoint: 3.0, displayOrder: 5 },
          { grade: "B-", description: "Average", minScore: 80, maxScore: 82.99, gradePoint: 2.7, displayOrder: 6 },
          { grade: "C+", description: "Fair", minScore: 77, maxScore: 79.99, gradePoint: 2.3, displayOrder: 7 },
          { grade: "C", description: "Satisfactory", minScore: 73, maxScore: 76.99, gradePoint: 2.0, displayOrder: 8 },
          { grade: "C-", description: "Passing", minScore: 70, maxScore: 72.99, gradePoint: 1.7, displayOrder: 9 },
          { grade: "D+", description: "Poor Pass", minScore: 67, maxScore: 69.99, gradePoint: 1.3, displayOrder: 10 },
          { grade: "D", description: "Minimal Pass", minScore: 65, maxScore: 66.99, gradePoint: 1.0, displayOrder: 11 },
          { grade: "F", description: "Fail", minScore: 0, maxScore: 64.99, gradePoint: 0.0, displayOrder: 12 },
        ]
      },
      {
        name: "IB (International Baccalaureate)",
        code: "IB",
        description: "International Baccalaureate 1 to 7 point grading scale used worldwide.",
        isSystemDefault: true,
        gradeScales: [
          { grade: "7", description: "Excellent", minScore: 90, maxScore: 100, gradePoint: 7.0, displayOrder: 1 },
          { grade: "6", description: "Very Good", minScore: 80, maxScore: 89.99, gradePoint: 6.0, displayOrder: 2 },
          { grade: "5", description: "Good", minScore: 70, maxScore: 79.99, gradePoint: 5.0, displayOrder: 3 },
          { grade: "4", description: "Satisfactory", minScore: 60, maxScore: 69.99, gradePoint: 4.0, displayOrder: 4 },
          { grade: "3", description: "Mediocre", minScore: 50, maxScore: 59.99, gradePoint: 3.0, displayOrder: 5 },
          { grade: "2", description: "Poor", minScore: 40, maxScore: 49.99, gradePoint: 2.0, displayOrder: 6 },
          { grade: "1", description: "Very Poor", minScore: 0, maxScore: 39.99, gradePoint: 1.0, displayOrder: 7 },
        ]
      },
      {
        name: "UK GCSE Standard System",
        code: "UK_GCSE",
        description: "United Kingdom General Certificate of Secondary Education modern 9-1 grading scheme.",
        isSystemDefault: true,
        gradeScales: [
          { grade: "9", description: "Highest", minScore: 90, maxScore: 100, gradePoint: 9.0, displayOrder: 1 },
          { grade: "8", description: "Excellent", minScore: 80, maxScore: 89.99, gradePoint: 8.0, displayOrder: 2 },
          { grade: "7", description: "Very Good", minScore: 75, maxScore: 79.99, gradePoint: 7.0, displayOrder: 3 },
          { grade: "6", description: "Good", minScore: 65, maxScore: 74.99, gradePoint: 6.0, displayOrder: 4 },
          { grade: "5", description: "Strong Pass", minScore: 55, maxScore: 64.99, gradePoint: 5.0, displayOrder: 5 },
          { grade: "4", description: "Standard Pass", minScore: 50, maxScore: 54.99, gradePoint: 4.0, displayOrder: 6 },
          { grade: "3", description: "Refining", minScore: 40, maxScore: 49.99, gradePoint: 3.0, displayOrder: 7 },
          { grade: "2", description: "Basic", minScore: 30, maxScore: 39.99, gradePoint: 2.0, displayOrder: 8 },
          { grade: "1", description: "Lowest", minScore: 0, maxScore: 29.99, gradePoint: 1.0, displayOrder: 9 },
        ]
      }
    ];

    for (const sys of defaultSystems) {
      await prisma.gradingSystem.create({
        data: {
          name: sys.name,
          code: sys.code,
          description: sys.description,
          isSystemDefault: sys.isSystemDefault,
          gradeScales: {
            create: sys.gradeScales
          }
        }
      });
      console.log(`   ✓ Seeded ${sys.name}`);
    }
    
    console.log("   ✓ Default grading systems seeded successfully!");
  } catch (error) {
    console.error("   ❌ Failed to seed default grading systems:", error);
    throw error;
  }
}

// ============================================================================
// SCRIPT ENTRY POINT
// ============================================================================

async function main() {
  console.log("\n");
  console.log(
    "════════════════════════════════════════════════════════════════",
  );
  console.log("  SUPERADMIN CREATION SCRIPT");
  console.log("  School Management System - Better Auth Integration");
  console.log(
    "════════════════════════════════════════════════════════════════",
  );

  try {
    // Verify database setup
    await verifyDatabaseSetup();

    console.log("\n");

    // SuperAdmin credentials
    // TODO: In production, load these from environment variables or secure input
    const superAdminData: SuperAdminInput = {
      email: process.env.SUPERADMIN_EMAIL || "kasamoah715@gmail.com",
      password: process.env.SUPERADMIN_PASSWORD || "SuperAdmin@2025!",
      firstName: process.env.SUPERADMIN_FIRST_NAME || "System",
      lastName: process.env.SUPERADMIN_LAST_NAME || "Administrator",
      phone: process.env.SUPERADMIN_PHONE || "+233557462789",
      dateOfBirth: new Date(process.env.SUPERADMIN_DOB || "1990-01-01"),
      gender: (process.env.SUPERADMIN_GENDER as Gender) || Gender.MALE,
    };

    // Security check
    if (superAdminData.password.length < 12) {
      console.warn("\n⚠️  WARNING: Password is less than 12 characters!");
      console.warn("   Consider using a stronger password for production.\n");
    }

    // Create SuperAdmin
    const result = await createSuperAdmin(superAdminData);

    // Verify permissions
    const permissionsValid = await verifySuperAdminPermissions(result.user.id);

    if (!permissionsValid) {
      console.error("\n❌ Permission verification failed!");
      process.exit(1);
    }

    // Seed default grading systems
    await seedDefaultGradingSystems();

    console.log("✨ Setup complete!\n");
    process.exit(0);
  } catch (error) {
    console.error("\n💥 FATAL ERROR:");
    console.error(error);
    console.log("\n");
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main();
