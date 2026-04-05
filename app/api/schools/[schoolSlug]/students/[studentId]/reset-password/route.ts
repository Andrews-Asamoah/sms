// app/api/schools/[schoolSlug]/students/[studentId]/reset-password/route.ts
//
// Allows admins to reset a student's password and store the new plain-text
// password on the Student record so it can be handed back to the student
// (students use auto-generated dummy emails and often forget credentials).

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import crypto from "crypto";

// ============================================================================
// HELPERS
// ============================================================================

/** 8-character hex password — same format used at student creation. */
function generateSecurePassword(): string {
  return crypto.randomBytes(4).toString("hex");
}

// ============================================================================
// POST — reset a student's password
// ============================================================================

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; studentId: string }> },
) {
  try {
    const { schoolSlug, studentId } = await params;

    // ── 1. Auth ──────────────────────────────────────────────────────────────
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner" &&
      !session.isSuperAdmin
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // ── 2. Load student with user + accounts ─────────────────────────────────
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        profile: {
          include: {
            user: {
              include: {
                // Check whether a credential account row exists.
                // Students created before the signUpEmail fix may be missing it.
                accounts: true,
              },
            },
          },
        },
      },
    });

    if (!student?.profile?.user) {
      return NextResponse.json(
        { error: "Student or user account not found" },
        { status: 404 },
      );
    }

    const existingUser = student.profile.user;
    const newPassword = generateSecurePassword();

    // ── 3. Set password via Better Auth ──────────────────────────────────────
    //
    // Two cases:
    //
    // A) Credential account row EXISTS → use auth.api.setUserPassword.
    //    This is the correct Better Auth admin API — it handles hashing
    //    internally with whatever algorithm BA uses, keeping things consistent.
    //    Note: the method is on auth.api directly, NOT auth.api.admin.
    //
    // B) Credential account row is MISSING (student created before the
    //    signUpEmail fix) → use auth.api.signUpEmail to recreate both the
    //    user and account rows atomically. This is the same repair path
    //    used in the bulk upload route.
    //
    const hasCredentialAccount = existingUser.accounts.some(
      (a) => a.providerId === "credential",
    );

    // ── 3a. Self-heal the calling admin's global user.role ──────────────────
    //
    // Better Auth's admin plugin checks session.user.role (global DB field).
    // School admins created before this fix have user.role = "user" — we sync
    // it here so the setUserPassword check passes without a DB migration.
    const ELEVATED_ROLES = ["owner", "admin", "headteacher", "superAdmin"];
    const callerEffectiveRole = role?.effectiveRole ?? "";
    if (ELEVATED_ROLES.includes(callerEffectiveRole)) {
      const callerDbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      });
      if (
        callerDbUser &&
        callerDbUser.role !== "superAdmin" &&
        callerDbUser.role !== callerEffectiveRole
      ) {
        await prisma.user.update({
          where: { id: session.user.id },
          data: { role: callerEffectiveRole },
        });
      }
    }

    if (hasCredentialAccount) {
      // ── Case A: normal password update via admin plugin ───────────────────
      //
      // auth.api.setUserPassword here is the ADMIN plugin's version registered
      // at /admin/set-user-password (it overrides the base email/password one).
      // It checks user["set-password"] permission against the session user's
      // global user.role.  We've added "owner"/"admin"/"headteacher" to the
      // plugin's adminRoles, and those roles are now synced to user.role on
      // org membership — so school admins pass this check.
      await auth.api.setUserPassword({
        body: {
          userId: existingUser.id,
          newPassword,
        },
        headers: req.headers,
      });
    } else {
      // ── Case B: credential account row missing — recreate via signUpEmail ──
      //
      // Students created before the signUpEmail fix may be missing an account
      // row. signUpEmail recreates both user + account atomically.
      await auth.api.signUpEmail({
        body: {
          email: existingUser.email,
          password: newPassword,
          name: existingUser.name,
        },
        headers: req.headers,
      });

      // Ensure the repaired account is marked as verified immediately.
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { emailVerified: true },
      });
    }

    // ── 4. Store plain-text password for admin visibility ────────────────────
    //
    // Students use auto-generated dummy emails and frequently forget their
    // credentials. Storing the plain-text password on the Student record
    // allows admins to look it up and hand it back to the student or guardian.
    //
    await prisma.student.update({
      where: { id: student.id },
      data: { plainTextPassword: newPassword },
    });

    // ── 5. Audit log ─────────────────────────────────────────────────────────
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entityType: "USER_PASSWORD",
        entityId: existingUser.id,
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
