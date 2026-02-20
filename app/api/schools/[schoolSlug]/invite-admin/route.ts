// app/api/schools/[schoolSlug]/invite-admin/route.ts - CORRECT BETTER AUTH SERVER-SIDE

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

const inviteAdminSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  phone: z.string().optional(),
});

type InviteAdminData = z.infer<typeof inviteAdminSchema>;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface BetterAuthInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date;
  inviterId: string;
}

interface ApiError extends Error {
  status?: string;
  statusCode?: number;
  body?: unknown;
}

// ============================================================================
// POST - Invite Admin to School
// ============================================================================

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    console.log("[INVITE_ADMIN] Starting invitation process");

    const { schoolSlug } = await context.params;
    console.log(`[INVITE_ADMIN] School Slug: ${schoolSlug}`);

    // ========================================================================
    // Get session for authentication & authorization
    // ========================================================================
    const requestHeaders = await headers();
    const session = await auth.api.getSession({
      headers: requestHeaders,
    });

    if (!session) {
      console.error("[INVITE_ADMIN] Unauthorized: No session");
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    console.log(`[INVITE_ADMIN] User: ${session.user.email}`);
    console.log(`[INVITE_ADMIN] User ID: ${session.user.id}`);

    // ========================================================================
    // Get school and check permissions
    // ========================================================================
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      include: {
        organization: {
          include: {
            members: {
              where: { userId: session.user.id },
            },
          },
        },
      },
    });

    if (!school) {
      console.error("[INVITE_ADMIN] School not found:", schoolSlug);
      return NextResponse.json(
        { success: false, error: "School not found" },
        { status: 404 },
      );
    }

    console.log(`[INVITE_ADMIN] School: ${school.name}`);
    console.log(`[INVITE_ADMIN] Organization ID: ${school.organizationId}`);

    // Check permissions via database
    const userRecord = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    const isSuperAdmin = userRecord?.role === "superAdmin";
    const membership = school.organization.members[0];
    const isOwnerOrAdmin =
      membership &&
      (membership.role === "owner" || membership.role === "admin");

    console.log(`[INVITE_ADMIN] Is SuperAdmin: ${isSuperAdmin}`);
    console.log(`[INVITE_ADMIN] Is Owner/Admin: ${isOwnerOrAdmin}`);

    if (!isSuperAdmin && !isOwnerOrAdmin) {
      console.error("[INVITE_ADMIN] Insufficient permissions");
      return NextResponse.json(
        {
          success: false,
          error: "You must be an owner or admin to invite users",
        },
        { status: 403 },
      );
    }

    console.log("[INVITE_ADMIN] ✅ Permission check passed");

    // ========================================================================
    // Validate request body
    // ========================================================================
    const body = await request.json();
    const validation = inviteAdminSchema.safeParse(body);

    if (!validation.success) {
      console.error("[INVITE_ADMIN] Validation failed:", validation.error);
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const data: InviteAdminData = validation.data;
    console.log(`[INVITE_ADMIN] Inviting: ${data.email} as ${data.role}`);

    // ========================================================================
    // Check for existing user
    // ========================================================================
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
      include: {
        members: {
          where: { organizationId: school.organizationId },
        },
      },
    });

    if (existingUser) {
      console.log("[INVITE_ADMIN] User exists:", existingUser.id);

      if (existingUser.members.length > 0) {
        const existingMembership = existingUser.members[0];
        console.error(
          "[INVITE_ADMIN] User already a member:",
          existingMembership.role,
        );
        return NextResponse.json(
          {
            success: false,
            error: `${data.email} is already a ${existingMembership.role}`,
            conflict: true,
            existingRole: existingMembership.role,
          },
          { status: 409 },
        );
      }

      // Add existing user as member
      console.log("[INVITE_ADMIN] Adding existing user as member");

      try {
        await auth.api.addMember({
          body: {
            organizationId: school.organizationId,
            userId: existingUser.id,
            role: data.role.toLowerCase() as "owner" | "admin" | "member",
          },
          headers: requestHeaders,
        });

        console.log("[INVITE_ADMIN] ✅ Existing user added");

        return NextResponse.json({
          success: true,
          message: `${data.email} has been added to ${school.name}`,
          userId: existingUser.id,
          isExistingUser: true,
        });
      } catch (addError) {
        console.error("[INVITE_ADMIN] Error adding member:", addError);
        const error = addError as Error;
        throw new Error(`Failed to add member: ${error.message}`);
      }
    }

    // ========================================================================
    // Check for pending invitation
    // ========================================================================
    const pendingInvitation = await prisma.invitation.findFirst({
      where: {
        email: data.email,
        organizationId: school.organizationId,
        status: "pending",
      },
    });

    if (pendingInvitation) {
      console.error("[INVITE_ADMIN] Pending invitation exists");
      return NextResponse.json(
        {
          success: false,
          error: `An invitation has already been sent to ${data.email}`,
          pending: true,
          invitationId: pendingInvitation.id,
        },
        { status: 409 },
      );
    }

    // ========================================================================
    // CREATE INVITATION
    // The issue is that Better Auth's permission check doesn't work properly
    // when called from API routes. We've already done our permission check above.
    //
    // Since your allowUserToInviteUser is correctly checking superAdmin and
    // owner/admin roles, but Better Auth is still blocking it, we need to
    // ensure the session has the full user context.
    // ========================================================================
    console.log("[INVITE_ADMIN] Creating invitation via Better Auth...");
    console.log(`[INVITE_ADMIN] Organization: ${school.organizationId}`);
    console.log(`[INVITE_ADMIN] Email: ${data.email}`);
    console.log(`[INVITE_ADMIN] Role: ${data.role.toLowerCase()}`);

    let invitation: BetterAuthInvitation;
    try {
      const result = await auth.api.createInvitation({
        body: {
          organizationId: school.organizationId,
          email: data.email,
          role: data.role.toLowerCase() as "owner" | "admin" | "member",
        },
        headers: requestHeaders,
      });

      invitation = result as BetterAuthInvitation;

      console.log(`[INVITE_ADMIN] ✅ Invitation created: ${invitation.id}`);
      console.log(
        "[INVITE_ADMIN] Email will be sent via afterCreateInvitation hook",
      );
    } catch (inviteError) {
      console.error(
        "[INVITE_ADMIN] Better Auth createInvitation failed:",
        inviteError,
      );

      const error = inviteError as ApiError;
      console.error("[INVITE_ADMIN] Error message:", error.message);
      console.error("[INVITE_ADMIN] Error status:", error.status);

      // If Better Auth still blocks it due to permission issues,
      // the problem is in the allowUserToInviteUser function not being
      // called or not receiving correct user data
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Failed to send invitation",
          details: error.body || "Unknown error",
          hint: "Check that allowUserToInviteUser function is being called with correct user data",
        },
        { status: error.statusCode || 500 },
      );
    }

    // ========================================================================
    // Create audit log
    // ========================================================================
    try {
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "CREATE",
          entityType: "INVITATION",
          entityId: invitation.id,
          newValues: {
            email: data.email,
            role: data.role,
            organizationId: school.organizationId,
            schoolId: school.id,
            schoolName: school.name,
            invitedAt: new Date().toISOString(),
          },
        },
      });
      console.log("[INVITE_ADMIN] Audit log created");
    } catch (auditError) {
      console.error("[INVITE_ADMIN] Failed to create audit log:", auditError);
    }

    // ========================================================================
    // Success response
    // ========================================================================
    console.log("[INVITE_ADMIN] ✅ Invitation sent successfully");

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${data.email}`,
      invitationId: invitation.id,
      expiresAt: invitation.expiresAt,
      isNewUser: true,
    });
  } catch (error) {
    console.error("[INVITE_ADMIN] ❌ Unhandled error:", error);

    const err = error as Error;
    console.error("[INVITE_ADMIN] Error message:", err.message);
    console.error("[INVITE_ADMIN] Error stack:", err.stack);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to send invitation",
        details: err.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// GET - List pending invitations for a school
// ============================================================================

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await context.params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      include: {
        organization: {
          include: {
            members: {
              where: { userId: session.user.id },
            },
          },
        },
      },
    });

    if (!school) {
      return NextResponse.json(
        { success: false, error: "School not found" },
        { status: 404 },
      );
    }

    const userRecord = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    const isSuperAdmin = userRecord?.role === "superAdmin";
    const membership = school.organization.members[0];
    const isOwnerOrAdmin =
      membership &&
      (membership.role === "owner" || membership.role === "admin");

    if (!isSuperAdmin && !isOwnerOrAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 },
      );
    }

    const invitations = await prisma.invitation.findMany({
      where: {
        organizationId: school.organizationId,
        status: "pending",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: invitations,
      count: invitations.length,
    });
  } catch (error) {
    console.error("[INVITE_ADMIN_GET] Error:", error);

    const err = error as Error;
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch invitations",
        details: err.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}
