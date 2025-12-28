// app/api/setup/super-admin/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { SYSTEM_ROLES } from "@/lib/auth-utils";

// Generate unique school code
function generateSchoolCode(name: string): string {
  const prefix = name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);

  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${random}`;
}

// Generate organization slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST(req: Request) {
  try {
    // Check if setup already completed
    const existingSuperAdmin = await prisma.userProfile.count({
      where: { isSuperAdmin: true },
    });

    if (existingSuperAdmin > 0) {
      return NextResponse.json(
        { error: "Setup already completed" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const {
      schoolName,
      schoolEmail,
      schoolPhone,
      firstName,
      lastName,
      email,
      phone,
      password,
      gender,
      dob,
    } = body;

    // Validate required fields
    if (!schoolName || !firstName || !lastName || !email || !password || !dob) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Better Auth user
      const authUser = await auth.api.signUpEmail({
        body: {
          email,
          password,
          name: `${firstName} ${lastName}`,
        },
      });

      // 2. Create Organization (represents the school in Better Auth)
      const orgSlug = generateSlug(schoolName);
      const organization = await tx.organization.create({
        data: {
          name: schoolName,
          slug: orgSlug,
          metadata: JSON.stringify({
            setupAt: new Date().toISOString(),
            setupBy: authUser.user.id,
          }),
        },
      });

      // 3. Create School linked to Organization
      const schoolCode = generateSchoolCode(schoolName);
      const school = await tx.school.create({
        data: {
          organizationId: organization.id,
          name: schoolName,
          code: schoolCode,
          email: schoolEmail || null,
          phone: schoolPhone || null,
          setupCompleted: true,
          isActive: true,
        },
      });

      // 4. Create User Profile (super admin)
      const profile = await tx.userProfile.create({
        data: {
          userId: authUser.user.id,
          firstName,
          lastName,
          phone: phone || "",
          gender,
          dob: new Date(dob),
          isSuperAdmin: true,
          isActive: true,
        },
      });

      // 5. Add user to organization as admin
      await tx.organizationMember.create({
        data: {
          userId: authUser.user.id,
          organizationId: organization.id,
          role: SYSTEM_ROLES.SUPER_ADMIN,
        },
      });

      // 6. Create default system roles for the school
      const systemRoles = [
        {
          code: SYSTEM_ROLES.SCHOOL_ADMIN,
          name: "School Administrator",
          description:
            "Full access to school management (except super admin functions)",
          isSystem: true,
        },
        {
          code: SYSTEM_ROLES.HEADMASTER,
          name: "Headmaster/Principal",
          description: "Academic and administrative oversight",
          isSystem: true,
        },
        {
          code: SYSTEM_ROLES.TEACHER,
          name: "Teacher",
          description: "Teaching and student management",
          isSystem: true,
        },
        {
          code: SYSTEM_ROLES.ACCOUNTANT,
          name: "Accountant",
          description: "Financial management and reporting",
          isSystem: true,
        },
        {
          code: SYSTEM_ROLES.STUDENT,
          name: "Student",
          description: "Student access",
          isSystem: true,
        },
        {
          code: SYSTEM_ROLES.PARENT,
          name: "Parent/Guardian",
          description: "View student information",
          isSystem: true,
        },
      ];

      for (const roleData of systemRoles) {
        await tx.role.create({
          data: {
            schoolId: school.id,
            ...roleData,
          },
        });
      }

      // 7. Create default chart of accounts
      const defaultAccounts = [
        {
          code: "1000",
          name: "Assets",
          accountType: "ASSET",
          category: "CASH",
        },
        {
          code: "2000",
          name: "Liabilities",
          accountType: "LIABILITY",
          category: "ACCOUNTS_PAYABLE",
        },
        {
          code: "3000",
          name: "Equity",
          accountType: "EQUITY",
          category: "OTHER_INCOME",
        },
        {
          code: "4000",
          name: "Revenue",
          accountType: "REVENUE",
          category: "SCHOOL_FEES",
        },
        {
          code: "5000",
          name: "Expenses",
          accountType: "EXPENSE",
          category: "OTHER_EXPENSE",
        },
      ];

      for (const accountData of defaultAccounts) {
        await tx.chartAccount.create({
          data: {
            schoolId: school.id,
            ...accountData,
            isActive: true,
          },
        });
      }

      return {
        user: authUser.user,
        profile,
        school,
        organization,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        userId: result.user.id,
        email: result.user.email,
        schoolId: result.school.id,
        schoolCode: result.school.code,
        organizationId: result.organization.id,
      },
    });
  } catch (error: any) {
    console.error("[SETUP_ERROR]", error);

    return NextResponse.json(
      {
        error: error.message || "Setup failed. Please try again.",
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Check setup status
  try {
    const superAdminCount = await prisma.userProfile.count({
      where: { isSuperAdmin: true },
    });

    return NextResponse.json({
      setupCompleted: superAdminCount > 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to check setup status" },
      { status: 500 }
    );
  }
}
