import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import crypto from "crypto";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";

function generateSecurePassword(): string {
  // Generate an 8-character random readable password
  return crypto.randomBytes(4).toString("hex");
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; studentId: string }> },
) {
  try {
    const { schoolSlug, studentId } = await params;

    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    // Only admin or owner can reset student passwords
    if (
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner" &&
      !session.isSuperAdmin
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        profile: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!student || !student.profile?.user) {
      return NextResponse.json(
        { error: "Student or user account not found" },
        { status: 404 },
      );
    }

    const newPassword = generateSecurePassword();

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in the database for the user directly using Prisma
    // Since BetterAuth uses the `account` table for OAuth and stores local passwords
    // inside its internal setup, we might need to actually update the user's main password field
    // BetterAuth stores passwords in the `account` table under `password` if using email/pass
    const account = await prisma.account.findFirst({
      where: {
        userId: student.profile.user.id,
        providerId: "credential",
      },
    });

    if (account) {
      // Update existing credential account
      await prisma.account.update({
        where: { id: account.id },
        data: { password: hashedPassword },
      });
    } else {
      // Create new credential account if none exists
      await prisma.account.create({
        data: {
          id: crypto.randomUUID(),
          userId: student.profile.user.id,
          accountId: student.profile.user.email,
          providerId: "credential",
          password: hashedPassword,
        },
      });
    }

    // Update the plain text password in the Student model for admin visibility
    await prisma.student.update({
      where: { id: student.id },
      data: { plainTextPassword: newPassword },
    });

    // Create an audit log for the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entityType: "USER_PASSWORD",
        entityId: student.profile.user.id,
        newValues: {
          action: "admin_password_reset",
          studentId: student.id,
          resetBy: session.user.email,
        },
      },
    });

    return NextResponse.json({ success: true, newPassword }, { status: 200 });
  } catch (error) {
    console.error("[Reset Password] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to reset password",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
