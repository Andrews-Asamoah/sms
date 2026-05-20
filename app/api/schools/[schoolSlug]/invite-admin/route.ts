// app/api/schools/[schoolSlug]/invite-admin/route.ts

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { verifyApiSchoolAccess } from "@/lib/auth/guards";

// All roles that can be assigned via invitation
// These map directly to Member.role in the DB via Better Auth custom roles
const ALL_ORG_ROLES = [
  "OWNER",
  "ADMIN",
  "MEMBER",
  "TEACHER",
  "HEADTEACHER",
  "ACCOUNTANT",
  "GUARDIAN",
] as const;

type OrgRole = (typeof ALL_ORG_ROLES)[number];
type OrgRoleLower = Lowercase<OrgRole>;

const inviteAdminSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(ALL_ORG_ROLES),
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
    const { schoolSlug } = await context.params;

    // Authenticate and authorize via unified guard
    const access = await verifyApiSchoolAccess(schoolSlug, ["owner", "admin"]);
    if (!access.authorized) return access.errorResponse;
    const { session } = access;

    const requestHeaders = await headers();

    // ========================================================================
    // Get school
    // ========================================================================
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
    });

    if (!school) {
      console.error("[INVITE_ADMIN] School not found:", schoolSlug);
      return NextResponse.json(
        { success: false, error: "School not found" },
        { status: 404 },
      );
    }

    // Validate request body
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

    // Check for existing user
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
      include: {
        members: {
          where: { organizationId: school.organizationId },
        },
      },
    });

    if (existingUser) {
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
      try {
        await auth.api.addMember({
          body: {
            organizationId: school.organizationId,
            userId: existingUser.id,
            role: data.role.toLowerCase() as OrgRoleLower,
          },
          headers: requestHeaders,
        });

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

    // CREATE INVITATION via Better Auth
    let invitation: BetterAuthInvitation;
    try {
      const result = await auth.api.createInvitation({
        body: {
          organizationId: school.organizationId,
          email: data.email,
          role: data.role.toLowerCase() as OrgRoleLower,
        },
        headers: requestHeaders,
      });

      invitation = result as BetterAuthInvitation;
    } catch (inviteError) {
      console.error(
        "[INVITE_ADMIN] Better Auth createInvitation failed:",
        inviteError,
      );

      const error = inviteError as ApiError;
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Failed to send invitation",
          details: error.body || "Unknown error",
        },
        { status: error.statusCode || 500 },
      );
    }

    // Create audit log
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
    } catch (auditError) {
      console.error("[INVITE_ADMIN] Failed to create audit log:", auditError);
    }

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${data.email}`,
      invitationId: invitation.id,
      expiresAt: invitation.expiresAt,
      isNewUser: true,
    });
  } catch (error) {
    console.error("[INVITE_ADMIN] Unhandled error:", error);

    const err = error as Error;
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

    // Authenticate and authorize via unified guard
    const access = await verifyApiSchoolAccess(schoolSlug, ["owner", "admin"]);
    if (!access.authorized) return access.errorResponse;

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
    });

    if (!school) {
      return NextResponse.json(
        { success: false, error: "School not found" },
        { status: 404 },
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
