// app/api/schools/[schoolId]/invite-admin/route.ts - REFACTORED
import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    schoolSlug: string;
  }>;
};

// POST - Create invitation
export async function POST(request: NextRequest, context: RouteContext) {
  console.log("📨 [Invite API] Starting invitation process...");

  try {
    const session = await getAuthSession();
    if (!session || !session.isSuperAdmin) {
      console.log("❌ [Invite API] Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const params = await context.params;
    const { schoolSlug } = params;
    const body = await request.json();
    const { email, role = "MEMBER" } = body;

    console.log(
      `📧 [Invite API] Processing invitation for ${email} with role ${role}`,
    );

    if (!email) {
      console.log("❌ [Invite API] Email is required");
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log(`❌ [Invite API] Invalid email format: ${email}`);
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    // Get school with organization
    console.log(`🏫 [Invite API] Fetching school ${schoolSlug}...`);
    const school = await prisma.school.findUnique({
      where: { id: schoolSlug },
      select: {
        id: true,
        name: true,
        organizationId: true,
      },
    });

    if (!school) {
      console.log(`❌ [Invite API] School not found: ${schoolSlug}`);
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    console.log(`✅ [Invite API] School found: ${school.name}`);

    // Check if user already exists
    console.log(`👤 [Invite API] Checking if user exists: ${email}`);
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });

    if (existingUser) {
      console.log(`✅ [Invite API] User exists: ${existingUser.id}`);

      // Check if already a member
      const existingMember = await prisma.member.findFirst({
        where: {
          userId: existingUser.id,
          organizationId: school.organizationId,
        },
      });

      if (existingMember) {
        console.log(`⚠️ [Invite API] User is already a member`);
        return NextResponse.json(
          { error: "User is already a member of this school" },
          { status: 400 },
        );
      }

      // Add existing user using Better Auth API
      console.log(`➕ [Invite API] Adding existing user as member...`);
      const result = await auth.api.addMember({
        body: {
          organizationId: school.organizationId,
          userId: existingUser.id,
          role: role.toLowerCase() as "owner" | "admin" | "member",
        },
        headers: await headers(),
      });

      if (!result) {
        throw new Error("Failed to add member");
      }

      console.log(`✅ [Invite API] User added successfully`);
      return NextResponse.json({
        message: "User added to school successfully",
        user: existingUser,
      });
    }

    // Check for existing pending invitation
    console.log(`🔍 [Invite API] Checking for existing invitations...`);
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
        organizationId: school.organizationId,
        status: "pending",
        expiresAt: { gte: new Date() },
      },
    });

    if (existingInvitation) {
      console.log(
        `⚠️ [Invite API] Pending invitation already exists: ${existingInvitation.id}`,
      );
      return NextResponse.json(
        {
          error: "A pending invitation already exists for this email",
          invitation: {
            id: existingInvitation.id,
            expiresAt: existingInvitation.expiresAt,
          },
        },
        { status: 400 },
      );
    }

    // Create invitation using Better Auth API
    console.log(`📝 [Invite API] Creating new invitation...`);
    const invitation = await auth.api.createInvitation({
      body: {
        organizationId: school.organizationId,
        email,
        role: role.toLowerCase() as "owner" | "admin" | "member",
      },
      headers: await headers(),
    });

    if (!invitation) {
      throw new Error("Failed to create invitation");
    }

    console.log(`✅ [Invite API] Invitation created`);
    console.log(`✅ [Invite API] Email will be sent via Better Auth hooks`);

    console.log(`✅ [Invite API] Invitation process completed successfully`);
    return NextResponse.json({
      message: "Invitation sent successfully",
      invitation: {
        email: invitation.email,
        role: invitation.role,
      },
    });
  } catch (error) {
    console.error("❌ [Invite API] Error inviting admin:", error);
    return NextResponse.json(
      {
        error: "Failed to invite admin",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// GET - List pending invitations for a school
export async function GET(request: NextRequest, context: RouteContext) {
  console.log("📋 [Invite API] Fetching invitations...");

  try {
    const session = await getAuthSession();
    if (!session) {
      console.log("❌ [Invite API] Unauthorized - no session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { schoolSlug } = params;

    const school = await prisma.school.findUnique({
      where: { id: schoolSlug },
      select: {
        id: true,
        organizationId: true,
      },
    });

    if (!school) {
      console.log(`❌ [Invite API] School not found: ${schoolSlug}`);
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Use Better Auth API to list invitations
    const invitations = await auth.api.listInvitations({
      query: {
        organizationId: school.organizationId,
      },
      headers: await headers(),
    });

    console.log(`✅ [Invite API] Found invitations`);
    return NextResponse.json({
      invitations: invitations || [],
    });
  } catch (error) {
    console.error("❌ [Invite API] Error fetching invitations:", error);
    return NextResponse.json(
      { error: "Failed to fetch invitations" },
      { status: 500 },
    );
  }
}

// DELETE - Cancel invitation
export async function DELETE(request: NextRequest) {
  console.log("🗑️ [Invite API] Cancelling invitation...");

  try {
    const session = await getAuthSession();
    if (!session) {
      console.log("❌ [Invite API] Unauthorized - no session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get("invitationId");

    if (!invitationId) {
      console.log("❌ [Invite API] Invitation ID is required");
      return NextResponse.json(
        { error: "Invitation ID is required" },
        { status: 400 },
      );
    }

    // Use Better Auth API to cancel invitation
    const result = await auth.api.cancelInvitation({
      body: {
        invitationId,
      },
      headers: await headers(),
    });

    if (!result) {
      throw new Error("Failed to cancel invitation");
    }

    console.log(`✅ [Invite API] Invitation cancelled: ${invitationId}`);
    return NextResponse.json({ message: "Invitation cancelled successfully" });
  } catch (error) {
    console.error("❌ [Invite API] Error cancelling invitation:", error);
    return NextResponse.json(
      { error: "Failed to cancel invitation" },
      { status: 500 },
    );
  }
}
