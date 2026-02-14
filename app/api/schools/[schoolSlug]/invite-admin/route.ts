// app/api/schools/[schoolId]/invite-admin/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const inviteAdminSchema = z.object({
  email: z.email("Invalid email address"),
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
  // Optional profile fields for pre-filling
  firstName: z
    .string()
    .min(2, "First name must be at least 2 characters")
    .optional(),
  lastName: z
    .string()
    .min(2, "Last name must be at least 2 characters")
    .optional(),
  phone: z.string().optional(),
});

type InviteAdminData = z.infer<typeof inviteAdminSchema>;

// ============================================================================
// POST - Invite Admin to School
// ============================================================================

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    console.log("[INVITE_ADMIN] Starting invitation process");

    // Await params (Next.js 15+ requirement)
    const { schoolSlug } = await context.params;

    console.log(`[INVITE_ADMIN] School Slug: ${schoolSlug}`);

    // ========================================================================
    // STEP 1: Authenticate and verify permissions
    // ========================================================================
    const session = await getSession();

    if (!session) {
      console.error("[INVITE_ADMIN] Unauthorized: No session");
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    console.log(`[INVITE_ADMIN] User: ${session.user.email}`);
    console.log(`[INVITE_ADMIN] Is SuperAdmin: ${session.isSuperAdmin}`);

    // ========================================================================
    // STEP 2: Validate school exists and get organization
    // ========================================================================
    console.log("[INVITE_ADMIN] Fetching school by subdomain...");

    let school;
    try {
      school = await prisma.school.findUnique({
        where: { subdomain: schoolSlug }, // Use subdomain instead of id
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
    } catch (dbError) {
      console.error("[INVITE_ADMIN] Database error fetching school:", dbError);
      throw new Error(
        `Database error: ${dbError instanceof Error ? dbError.message : String(dbError)}`,
      );
    }

    if (!school) {
      console.error(
        "[INVITE_ADMIN] School not found with subdomain:",
        schoolSlug,
      );
      return NextResponse.json(
        { success: false, error: "School not found" },
        { status: 404 },
      );
    }

    console.log(`[INVITE_ADMIN] School: ${school.name} (ID: ${school.id})`);
    console.log(`[INVITE_ADMIN] Organization ID: ${school.organizationId}`);

    // ========================================================================
    // STEP 3: Check permissions
    // ========================================================================
    const isSuperAdmin = session.isSuperAdmin;
    const membership = school.organization.members[0]; // User's membership in this org
    const isOwnerOrAdmin =
      membership &&
      (membership.role === "owner" || membership.role === "admin");

    if (!isSuperAdmin && !isOwnerOrAdmin) {
      console.error(
        "[INVITE_ADMIN] Unauthorized: User is not owner/admin of this organization",
      );
      return NextResponse.json(
        {
          success: false,
          error: "You must be an owner or admin to invite users to this school",
        },
        { status: 403 },
      );
    }

    console.log("[INVITE_ADMIN] Permission granted");
    if (isSuperAdmin) {
      console.log("[INVITE_ADMIN] Acting as SuperAdmin");
    } else {
      console.log(`[INVITE_ADMIN] Acting as ${membership.role}`);
    }

    // ========================================================================
    // STEP 4: Parse and validate request body
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
    // STEP 5: Check if user already exists
    // ========================================================================
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
      include: {
        memberships: {
          where: { organizationId: school.organizationId },
        },
      },
    });

    if (existingUser) {
      console.log("[INVITE_ADMIN] User already exists:", existingUser.id);

      // Check if already a member of this organization
      if (existingUser.memberships.length > 0) {
        const existingMembership = existingUser.memberships[0];
        console.error(
          "[INVITE_ADMIN] User is already a member:",
          existingMembership.role,
        );
        return NextResponse.json(
          {
            success: false,
            error: `${data.email} is already a ${existingMembership.role} of this school`,
            conflict: true,
            existingRole: existingMembership.role,
          },
          { status: 409 },
        );
      }

      // User exists but not a member - add them directly
      console.log("[INVITE_ADMIN] Adding existing user as member");

      await auth.api.addMember({
        body: {
          organizationId: school.organizationId,
          userId: existingUser.id,
          role: data.role.toLowerCase() as "owner" | "admin" | "member",
        },
        headers: request.headers,
      });

      console.log("[INVITE_ADMIN] ✅ Existing user added successfully");

      return NextResponse.json({
        success: true,
        message: `${data.email} has been added to ${school.name}`,
        userId: existingUser.id,
        isExistingUser: true,
      });
    }

    // ========================================================================
    // STEP 6: Check for pending invitation
    // ========================================================================
    const pendingInvitation = await prisma.invitation.findFirst({
      where: {
        email: data.email,
        organizationId: school.organizationId,
        status: "pending",
      },
    });

    if (pendingInvitation) {
      console.error("[INVITE_ADMIN] Pending invitation already exists");
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
    // STEP 7: Create invitation via Better Auth
    // ========================================================================
    console.log("[INVITE_ADMIN] Creating invitation via Better Auth...");
    console.log("[INVITE_ADMIN] Organization ID:", school.organizationId);
    console.log("[INVITE_ADMIN] Email:", data.email);
    console.log("[INVITE_ADMIN] Role:", data.role);

    let invitation;
    try {
      invitation = await auth.api.createInvitation({
        body: {
          organizationId: school.organizationId,
          email: data.email,
          role: data.role.toLowerCase() as "owner" | "admin" | "member",
        },
        headers: request.headers,
      });
    } catch (inviteError) {
      console.error(
        "[INVITE_ADMIN] Better Auth createInvitation failed:",
        inviteError,
      );

      // Log detailed error information
      if (inviteError instanceof Error) {
        console.error("[INVITE_ADMIN] Error name:", inviteError.name);
        console.error("[INVITE_ADMIN] Error message:", inviteError.message);
        console.error("[INVITE_ADMIN] Error stack:", inviteError.stack);
      }

      throw new Error(
        `Failed to create invitation via Better Auth: ${
          inviteError instanceof Error
            ? inviteError.message
            : String(inviteError)
        }`,
      );
    }

    if (!invitation) {
      console.error("[INVITE_ADMIN] Invitation is null/undefined");
      throw new Error("Failed to create invitation - no invitation returned");
    }

    console.log(`[INVITE_ADMIN] Invitation created: ${invitation.id}`);

    // ========================================================================
    // STEP 8: Store optional profile data as metadata (for future use)
    // ========================================================================
    // Note: Better Auth invitation emails will include role and school info
    // The optional profile fields (firstName, lastName, phone) can be used
    // after the user accepts the invitation to pre-populate their profile
    // You can store these in a separate mapping table if needed

    if (data.firstName || data.lastName || data.phone) {
      console.log("[INVITE_ADMIN] Optional profile data provided:");
      console.log(`  - First Name: ${data.firstName || "N/A"}`);
      console.log(`  - Last Name: ${data.lastName || "N/A"}`);
      console.log(`  - Phone: ${data.phone || "N/A"}`);

      // TODO: If you want to pre-fill profiles, you can:
      // 1. Add a metadata JSON field to the Invitation model in Prisma
      // 2. Store these values there
      // 3. Use them in the afterAcceptInvitation hook in auth.ts
      //
      // For now, the user will need to complete their profile after accepting
    }

    // ========================================================================
    // STEP 9: Log audit trail
    // ========================================================================
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

    // ========================================================================
    // STEP 10: Return success
    // ========================================================================
    // Note: Better Auth automatically sends the invitation email via the
    // sendInvitationEmail hook in auth.ts

    console.log("[INVITE_ADMIN] ✅ Invitation sent successfully");
    console.log("[INVITE_ADMIN] Email will be sent via Better Auth hook");

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${data.email}`,
      invitationId: invitation.id,
      expiresAt: invitation.expiresAt,
      isNewUser: true,
    });
  } catch (error) {
    console.error("[INVITE_ADMIN] ❌ Error:", error);

    // Log detailed error information
    if (error instanceof Error) {
      console.error("[INVITE_ADMIN] Error name:", error.name);
      console.error("[INVITE_ADMIN] Error message:", error.message);
      console.error("[INVITE_ADMIN] Error stack:", error.stack);
    }

    // Handle specific Better Auth errors
    if (error instanceof Error) {
      if (error.message.includes("not allowed to invite")) {
        return NextResponse.json(
          {
            success: false,
            error: "You don't have permission to invite users to this school",
            details: error.message,
          },
          { status: 403 },
        );
      }

      if (error.message.includes("already invited")) {
        return NextResponse.json(
          {
            success: false,
            error: "User has already been invited",
            details: error.message,
          },
          { status: 409 },
        );
      }

      if (
        error.message.includes("organization not found") ||
        error.message.includes("Organization not found")
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Organization not found",
            details: error.message,
          },
          { status: 404 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to send invitation",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
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
    // Await params (Next.js 15+ requirement)
    const { schoolSlug } = await context.params;

    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    // Get school and organization
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug }, // Use subdomain
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

    // Check permissions
    const isSuperAdmin = session.isSuperAdmin;
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

    // Get pending invitations
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
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch invitations",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
