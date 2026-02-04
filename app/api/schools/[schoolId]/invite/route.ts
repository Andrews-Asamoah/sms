// app/api/schools/[schoolId]/invite/route.ts - REFACTORED with proper architecture
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/config";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { logger } from "@/lib/utils/logger";
import {
  createInvitation,
  listInvitations,
  cancelInvitation,
} from "@/lib/services/invitation.service";

export const runtime = "nodejs";

// ============================================================================
// TYPES
// ============================================================================

type RouteContext = {
  params: Promise<{
    schoolId: string;
  }>;
};

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const inviteSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase(),
  role: z.enum(["owner", "admin", "teacher", "accountant", "staff"], {
    message:
      "Invalid role. Must be: owner, admin, teacher, accountant, or staff",
  }),
  // Optional profile data for pre-filling form
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  phone: z.string().optional(),
});

// ============================================================================
// POST - Create Invitation
// ============================================================================

/**
 * POST /api/schools/[schoolId]/invite
 * Create a new invitation to join a school
 *
 * @access superAdmin, owner, admin
 * @body { email, role, firstName?, lastName?, phone? }
 */
export async function POST(request: NextRequest, context: RouteContext) {
  logger.info("Invite API: Creating invitation");

  try {
    // 1. Authentication & Authorization
    const session = await requireRole(["superAdmin", "owner", "admin"]);

    // 2. Extract school ID
    const { schoolId } = await context.params;

    // 3. Validate request body
    const body = await request.json();
    const validatedData = inviteSchema.parse(body);

    // 4. Get school and verify access
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        organizationId: true,
      },
    });

    if (!school) {
      logger.warn("School not found", { schoolId });
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // 5. Verify user has access to this school's organization
    if (session.user.role !== "superAdmin") {
      const hasAccess = session.memberships.some(
        (m) => m.organizationId === school.organizationId,
      );

      if (!hasAccess) {
        logger.warn("User does not have access to school", {
          userId: session.user.id,
          schoolId,
        });
        return NextResponse.json(
          { error: "Access denied to this school" },
          { status: 403 },
        );
      }
    }

    // 6. Create invitation using service
    const invitation = await createInvitation({
      organizationId: school.organizationId,
      email: validatedData.email,
      role: validatedData.role,
    });

    logger.info("Invitation created successfully", {
      invitationId: invitation.id,
      email: validatedData.email,
      schoolId,
    });

    // 7. Return response with optional profile data
    return NextResponse.json(
      {
        success: true,
        message: `Invitation sent to ${validatedData.email}`,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          organizationId: invitation.organizationId,
          expiresAt: invitation.expiresAt,
        },
        // Optional: Include profile data for frontend use
        ...(validatedData.firstName &&
          validatedData.lastName && {
            profileData: {
              firstName: validatedData.firstName,
              lastName: validatedData.lastName,
              phone: validatedData.phone,
            },
          }),
      },
      { status: 201 },
    );
  } catch (error) {
    // Validation error
    if (error instanceof z.ZodError) {
      logger.warn("Validation error in invite API", {
        errors: error.issues,
      });

      return NextResponse.json(
        {
          error: "Validation error",
          details: error.issues.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        },
        { status: 400 },
      );
    }

    // Authorization error
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Business logic errors
    if (error instanceof Error) {
      logger.error("Error in invite API", {
        error: error.message,
        stack: error.stack,
      });

      return NextResponse.json(
        {
          error: "Invitation failed",
          message: error.message,
        },
        { status: 400 },
      );
    }

    // Unknown errors
    logger.error("Unknown error in invite API", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================================================
// GET - List Invitations
// ============================================================================

/**
 * GET /api/schools/[schoolId]/invite
 * List all invitations for a school
 *
 * @access superAdmin, owner, admin
 */
export async function GET(request: NextRequest, context: RouteContext) {
  logger.info("Invite API: Listing invitations");

  try {
    // 1. Authentication & Authorization
    const session = await requireRole(["superAdmin", "owner", "admin"]);

    // 2. Extract school ID
    const { schoolId } = await context.params;

    // 3. Get school
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        organizationId: true,
      },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // 4. Verify access
    if (session.user.role !== "superAdmin") {
      const hasAccess = session.memberships.some(
        (m) => m.organizationId === school.organizationId,
      );

      if (!hasAccess) {
        return NextResponse.json(
          { error: "Access denied to this school" },
          { status: 403 },
        );
      }
    }

    // 5. List invitations using service
    const invitations = await listInvitations(school.organizationId);

    logger.info("Invitations listed successfully", {
      schoolId,
      count: invitations.length,
    });

    return NextResponse.json({
      success: true,
      invitations,
      school: {
        id: school.id,
        name: school.name,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    logger.error("Error listing invitations", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Failed to fetch invitations" },
      { status: 500 },
    );
  }
}

// ============================================================================
// DELETE - Cancel Invitation
// ============================================================================

/**
 * DELETE /api/schools/[schoolId]/invite?invitationId=xxx
 * Cancel a pending invitation
 *
 * @access superAdmin, owner, admin
 * @query invitationId - ID of invitation to cancel
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  logger.info("Invite API: Cancelling invitation");

  try {
    // 1. Authentication & Authorization
    const session = await requireRole(["superAdmin", "owner", "admin"]);

    // 2. Extract invitation ID from query params
    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get("invitationId");

    if (!invitationId) {
      return NextResponse.json(
        { error: "Invitation ID is required" },
        { status: 400 },
      );
    }

    // 3. Get invitation details to verify access
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 },
      );
    }

    // 4. Verify access to organization
    if (session.user.role !== "superAdmin") {
      const hasAccess = session.memberships.some(
        (m) => m.organizationId === invitation.organizationId,
      );

      if (!hasAccess) {
        return NextResponse.json(
          { error: "Access denied to this invitation" },
          { status: 403 },
        );
      }
    }

    // 5. Cancel invitation using service
    await cancelInvitation(invitationId);

    logger.info("Invitation cancelled successfully", { invitationId });

    return NextResponse.json({
      success: true,
      message: "Invitation cancelled successfully",
      invitationId,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    logger.error("Error cancelling invitation", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Failed to cancel invitation" },
      { status: 500 },
    );
  }
}
