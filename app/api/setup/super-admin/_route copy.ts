// app/api/setup/super-admin/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createAuthUser } from "@/lib/auth-utils";
import { setupBaseSchema } from "@/schemas/index";

function generateSchoolCode(schoolName: string): string {
  const cleaned = schoolName
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  const prefix = cleaned.substring(0, 15);
  const timestamp = Date.now().toString().slice(-6);

  return `${prefix}-${timestamp}`;
}

async function ensureUniqueSchoolCode(schoolName: string): Promise<string> {
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    const code = generateSchoolCode(schoolName);

    const existing = await prisma.school.findUnique({
      where: { code },
      select: { id: true },
    });

    if (!existing) {
      return code;
    }

    attempts++;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  const code = generateSchoolCode(schoolName);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${code}-${random}`;
}

export async function POST(request: NextRequest) {
  try {
    // Check if setup has already been completed
    const [superAdminCount, completedSchoolCount] = await Promise.all([
      prisma.userProfile.count({ where: { isSuperAdmin: true } }),
      prisma.school.count({ where: { setupCompleted: true } }),
    ]);

    if (superAdminCount > 0 || completedSchoolCount > 0) {
      return NextResponse.json(
        { error: "Setup has already been completed. Access denied." },
        { status: 403 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validationResult = setupBaseSchema
      .omit({ schoolCode: true })
      .safeParse(body);

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return NextResponse.json(
        { error: firstError.message, field: firstError.path[0] },
        { status: 400 }
      );
    }

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
    } = validationResult.data;

    const schoolCode = await ensureUniqueSchoolCode(schoolName);
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Step 1: Create school first
    const school = await prisma.school.create({
      data: {
        name: schoolName.trim(),
        code: schoolCode,
        email: schoolEmail?.trim() || null,
        phone: schoolPhone?.trim() || null,
        currency: "GHS",
        timezone: "Africa/Accra",
        isActive: true,
        setupCompleted: true,
      },
    });

    // Step 2: Create user with Better Auth (handles user + account creation)
    let authResult;
    try {
      authResult = await createAuthUser({
        email: normalizedEmail,
        password: password,
        name: `${firstName.trim()} ${lastName.trim()}`,
        schoolId: school.id,
      });
    } catch (error) {
      // If user creation fails, rollback the school
      await prisma.school.delete({ where: { id: school.id } }).catch(() => {
        // Ignore errors during rollback
      });
      throw error;
    }

    // Step 3: Create user profile with super admin privileges
    let profile;
    try {
      profile = await prisma.userProfile.create({
        data: {
          userId: authResult.user.id,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone?.trim(),
          gender,
          dob: new Date(dob),
          roles: ["ADMIN", "ACCOUNTANT", "TEACHER", "STUDENT"],
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
        select: {
          id: true,
          staff: { select: { staffId: true } },
        },
      });
    } catch (error) {
      // If profile creation fails, rollback user and school
      await prisma.user
        .delete({ where: { id: authResult.user.id } })
        .catch(() => {});
      await prisma.school.delete({ where: { id: school.id } }).catch(() => {});
      throw error;
    }

    return NextResponse.json(
      {
        success: true,
        message: "School and super admin account created successfully",
        school: {
          id: school.id,
          name: school.name,
          code: school.code,
        },
        user: {
          id: authResult.user.id,
          name: authResult.user.name,
          email: authResult.user.email,
          staffId: profile.staff?.staffId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[SETUP_CREATE_ERROR]", error);

    if (error instanceof Error) {
      if (error.message.includes("already exists")) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }

      if (error.message.includes("Unique constraint")) {
        return NextResponse.json(
          { error: "An account with this information already exists" },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to complete setup. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
