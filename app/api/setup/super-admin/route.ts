// app/api/setup/super-admin/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * GET: Check if super admin setup is required
 */
export async function GET() {
  try {
    const existingSuperAdmin = await prisma.userProfile.findFirst({
      where: { isSuperAdmin: true },
      select: { id: true },
    });

    return NextResponse.json({
      setupRequired: !existingSuperAdmin,
    });
  } catch (error) {
    console.error("[SETUP_CHECK_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to check setup status" },
      { status: 500 }
    );
  }
}

/**
 * POST: Create super admin account using Better Auth's signUp
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Check if super admin already exists
    const existingSuperAdmin = await prisma.userProfile.findFirst({
      where: { isSuperAdmin: true },
      select: { id: true },
    });

    if (existingSuperAdmin) {
      return NextResponse.json(
        { error: "Super admin already exists. Setup is complete." },
        { status: 400 }
      );
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const { firstName, lastName, email, phone, password, gender, dob } = body;

    if (!firstName || !lastName || !email || !password || !gender || !dob) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // 3. Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // 4. Use Better Auth's signUpEmail to create user
    // This handles password hashing automatically
    const signUpResult = await auth.api.signUpEmail({
      body: {
        email: email.toLowerCase().trim(),
        password: password,
        name: `${firstName} ${lastName}`,
      },
    });

    if (!signUpResult || !signUpResult.user) {
      throw new Error("Failed to create user account");
    }

    // 5. Create user profile and staff record in transaction
    const superAdminUser = await prisma.$transaction(async (tx) => {
      // Create user profile
      const profile = await tx.userProfile.create({
        data: {
          userId: signUpResult.user.id,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone?.trim(),
          gender,
          dob: new Date(dob),
          roles: ["ADMIN"],
          activeRole: "ADMIN",
          isSuperAdmin: true,
          isActive: true,
          staff: {
            create: {
              staffId: `ADMIN-${Date.now()}`,
              staffType: "ADMIN",
              department: "Administration",
              isActive: true,
              hireDate: new Date(),
            },
          },
        },
        include: {
          staff: {
            select: {
              staffId: true,
            },
          },
        },
      });

      // Create initial academic year if it doesn't exist
      const existingYear = await tx.academicYear.findFirst();
      if (!existingYear) {
        const currentYear = new Date().getFullYear();
        await tx.academicYear.create({
          data: {
            name: `${currentYear}/${currentYear + 1}`,
            startDate: new Date(`${currentYear}-09-01`),
            endDate: new Date(`${currentYear + 1}-06-30`),
            isCurrent: true,
          },
        });
      }

      // Create initial sections if they don't exist
      const existingSections = await tx.section.count();
      if (existingSections === 0) {
        await tx.section.createMany({
          data: [
            { name: "Primary", code: "PRI" },
            { name: "Junior High School", code: "JHS" },
            { name: "Senior High School", code: "SHS" },
          ],
        });
      }

      return {
        user: signUpResult.user,
        profile,
      };
    });

    // 6. Return success response
    return NextResponse.json(
      {
        success: true,
        message: "Super admin account created successfully",
        user: {
          id: superAdminUser.user.id,
          name: superAdminUser.user.name,
          email: superAdminUser.user.email,
          staffId: superAdminUser.profile.staff?.staffId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[SETUP_CREATE_ERROR]", error);

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes("Unique constraint")) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 409 }
        );
      }

      if (error.message.includes("password")) {
        return NextResponse.json(
          { error: "Password does not meet requirements" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to create super admin account. Please try again." },
      { status: 500 }
    );
  }
}
