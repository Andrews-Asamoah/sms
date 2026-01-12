// app/api/schools/[schoolId]/invite-admin/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { MemberRole } from "@/lib/generated/prisma/client";
import { sendAdminInvitationEmail } from "@/lib/email/resend";
import crypto from "crypto";

type RouteContext = {
  params: Promise<{
    schoolId: string;
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
    const { schoolId } = params;
    const body = await request.json();
    const { email, role = "MEMBER" } = body;

    console.log(
      `📧 [Invite API] Processing invitation for ${email} with role ${role}`
    );

    // Validate and convert role to MemberRole enum
    let memberRole: MemberRole;
    const roleUpper = role.toUpperCase();

    if (roleUpper === "OWNER") {
      memberRole = MemberRole.OWNER;
    } else if (roleUpper === "ADMIN") {
      memberRole = MemberRole.ADMIN;
    } else {
      memberRole = MemberRole.MEMBER;
    }

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
        { status: 400 }
      );
    }

    // Get school with organization
    console.log(`🏫 [Invite API] Fetching school ${schoolId}...`);
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        organizationId: true,
      },
    });

    if (!school) {
      console.log(`❌ [Invite API] School not found: ${schoolId}`);
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
          { status: 400 }
        );
      }

      // Add existing user as member directly
      console.log(`➕ [Invite API] Adding existing user as member...`);
      await prisma.member.create({
        data: {
          userId: existingUser.id,
          organizationId: school.organizationId,
          role: memberRole,
        },
      });

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
        `⚠️ [Invite API] Pending invitation already exists: ${existingInvitation.id}`
      );
      return NextResponse.json(
        {
          error: "A pending invitation already exists for this email",
          invitation: {
            id: existingInvitation.id,
            expiresAt: existingInvitation.expiresAt,
          },
        },
        { status: 400 }
      );
    }

    // Create invitation directly
    console.log(`📝 [Invite API] Creating new invitation...`);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const invitation = await prisma.invitation.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: school.organizationId,
        email,
        role: role.toLowerCase(),
        status: "pending",
        expiresAt,
        inviterId: session.user.id,
      },
    });

    console.log(`✅ [Invite API] Invitation created: ${invitation.id}`);

    // Send email directly (not through Better Auth callback)
    console.log(`📧 [Invite API] Sending invitation email...`);
    try {
      const inviter = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true },
      });

      console.log(
        `📧 [Invite API] Fetched inviter: ${inviter?.name || inviter?.email}`
      );
      console.log(`📧 [Invite API] About to call sendAdminInvitationEmail...`);

      const emailResult = await sendAdminInvitationEmail({
        to: email,
        inviterName: inviter?.name || inviter?.email || "Administrator",
        schoolName: school.name,
        role: role,
        invitationId: invitation.id,
        expiresAt: invitation.expiresAt,
      });

      console.log(`✅ [Invite API] Email sent successfully to ${email}`);
      console.log(`✅ [Invite API] Email result:`, emailResult);
    } catch (emailError) {
      console.error("❌ [Invite API] Email sending failed:", emailError);
      console.error(
        "❌ [Invite API] Email error details:",
        emailError instanceof Error ? emailError.message : String(emailError)
      );
      // Don't fail the entire request if email fails
      // The invitation is created, they can be reminded later
    }

    console.log(`✅ [Invite API] Invitation process completed successfully`);
    return NextResponse.json({
      message: "Invitation sent successfully",
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error("❌ [Invite API] Error inviting admin:", error);
    return NextResponse.json(
      {
        error: "Failed to invite admin",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
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
    const { schoolId } = params;

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        organizationId: true,
        organization: {
          select: {
            invitations: {
              where: {
                status: "pending",
                expiresAt: { gte: new Date() },
              },
              include: {
                inviter: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
              orderBy: { createdAt: "desc" },
            },
            members: {
              where: { userId: session.user.id },
              select: { role: true },
            },
          },
        },
      },
    });

    if (!school) {
      console.log(`❌ [Invite API] School not found: ${schoolId}`);
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const isSuperAdmin = session.isSuperAdmin;
    const isMember = school.organization.members.length > 0;
    const isAdmin = school.organization.members.some(
      (m) => m.role === "ADMIN" || m.role === "OWNER"
    );

    if (!isSuperAdmin && !isMember) {
      console.log("❌ [Invite API] Unauthorized - not a member");
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    console.log(
      `✅ [Invite API] Found ${school.organization.invitations.length} invitations`
    );
    return NextResponse.json({
      invitations: school.organization.invitations,
      canManageInvitations: isSuperAdmin || isAdmin,
    });
  } catch (error) {
    console.error("❌ [Invite API] Error fetching invitations:", error);
    return NextResponse.json(
      { error: "Failed to fetch invitations" },
      { status: 500 }
    );
  }
}

// DELETE - Cancel invitation
export async function DELETE(request: NextRequest, context: RouteContext) {
  console.log("🗑️ [Invite API] Cancelling invitation...");

  try {
    const session = await getAuthSession();
    if (!session) {
      console.log("❌ [Invite API] Unauthorized - no session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { schoolId } = params;
    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get("invitationId");

    if (!invitationId) {
      console.log("❌ [Invite API] Invitation ID is required");
      return NextResponse.json(
        { error: "Invitation ID is required" },
        { status: 400 }
      );
    }

    console.log(`🔍 [Invite API] Finding invitation: ${invitationId}`);
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: {
        organization: {
          include: {
            school: { select: { id: true } },
            members: {
              where: { userId: session.user.id },
              select: { role: true },
            },
          },
        },
      },
    });

    if (!invitation || invitation.organization.school?.id !== schoolId) {
      console.log("❌ [Invite API] Invitation not found");
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    const isSuperAdmin = session.isSuperAdmin;
    const isAdmin = invitation.organization.members.some(
      (m) => m.role === "ADMIN" || m.role === "OWNER"
    );

    if (!isSuperAdmin && !isAdmin) {
      console.log("❌ [Invite API] Unauthorized to cancel");
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.invitation.update({
      where: { id: invitationId },
      data: { status: "cancelled" },
    });

    console.log(`✅ [Invite API] Invitation cancelled: ${invitationId}`);
    return NextResponse.json({ message: "Invitation cancelled successfully" });
  } catch (error) {
    console.error("❌ [Invite API] Error cancelling invitation:", error);
    return NextResponse.json(
      { error: "Failed to cancel invitation" },
      { status: 500 }
    );
  }
}
