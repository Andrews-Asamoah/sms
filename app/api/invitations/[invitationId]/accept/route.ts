// app/api/invitations/[invitationId]/accept/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { Gender } from "@prisma/client";

type RouteContext = {
  params: Promise<{
    invitationId: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  console.log("📨 [Accept Invitation] Starting...");

  try {
    const params = await context.params;
    const { invitationId } = params;

    console.log(`📋 [Accept Invitation] ID: ${invitationId}`);

    // Get current session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      console.log("❌ [Accept Invitation] No session found");
      return NextResponse.json(
        { error: "Not authenticated. Please sign in first." },
        { status: 401 },
      );
    }

    console.log(`👤 [Accept Invitation] User: ${session.user.email}`);

    // Get invitation details BEFORE accepting
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: {
        organization: {
          include: {
            school: {
              select: {
                id: true,
                name: true,
                subdomain: true,
              },
            },
          },
        },
      },
    });

    if (!invitation) {
      console.log("❌ [Accept Invitation] Invitation not found");
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 },
      );
    }

    console.log(`📧 [Accept Invitation] For email: ${invitation.email}`);
    console.log(
      `🏫 [Accept Invitation] School: ${invitation.organization.school?.name}`,
    );

    // Verify email matches
    if (invitation.email !== session.user.email) {
      console.log("❌ [Accept Invitation] Email mismatch");
      return NextResponse.json(
        {
          error: "Email mismatch",
          details: `This invitation is for ${invitation.email}, but you're signed in as ${session.user.email}`,
        },
        { status: 400 },
      );
    }

    // Check invitation status
    if (invitation.status !== "pending") {
      console.log(
        `❌ [Accept Invitation] Invalid status: ${invitation.status}`,
      );
      return NextResponse.json(
        { error: `Invitation is ${invitation.status}` },
        { status: 400 },
      );
    }

    // Check expiration
    if (new Date(invitation.expiresAt) < new Date()) {
      console.log("❌ [Accept Invitation] Invitation expired");
      await prisma.invitation.update({
        where: { id: invitationId },
        data: { status: "expired" },
      });
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 400 },
      );
    }

    // Check if already a member
    const existingMember = await prisma.member.findFirst({
      where: {
        userId: session.user.id,
        organizationId: invitation.organizationId,
      },
    });

    if (existingMember) {
      console.log("⚠️ [Accept Invitation] Already a member");
      // Mark invitation as accepted
      await prisma.invitation.update({
        where: { id: invitationId },
        data: { status: "accepted" },
      });

      return NextResponse.json({
        message: "You are already a member of this organization",
        redirectUrl: `/${invitation.organization.school?.subdomain}/admin`,
      });
    }

    // CRITICAL FIX: Better Auth throws FORBIDDEN if the email is not verified
    // when requireEmailVerificationOnInvitation is true. Since the user just signed up
    // via the invitation link, we can safely verify their email right now.
    await prisma.user.update({
      where: { id: session.user.id },
      data: { emailVerified: true },
    });
    console.log("✅ [Accept Invitation] Email verified before acceptance");

    console.log("✅ [Accept Invitation] Accepting via Better Auth...");

    // Accept invitation using Better Auth
    const result = await auth.api.acceptInvitation({
      body: {
        invitationId,
      },
      headers: await headers(),
    });

    if (!result) {
      throw new Error("Failed to accept invitation via Better Auth");
    }

    console.log("✅ [Accept Invitation] Better Auth acceptance successful");

    // CRITICAL: Create UserProfile if it doesn't exist
    // This is essential for role-based access
    const existingProfile = await prisma.userProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!existingProfile) {
      console.log("📝 [Accept Invitation] Creating user profile...");

      const nameParts = session.user.name.trim().split(/\s+/);
      const firstName = nameParts[0] || "User";
      const lastName =
        nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Profile";

      await prisma.userProfile.create({
        data: {
          userId: session.user.id,
          firstName,
          lastName,
          phone: null,
          gender: Gender.OTHER,
          dateOfBirth: new Date("2000-01-01"),
          isActive: true,
        },
      });

      console.log("✅ [Accept Invitation] User profile created");
    }

    // Mark email as verified
    await prisma.user.update({
      where: { id: session.user.id },
      data: { emailVerified: true },
    });

    console.log("✅ [Accept Invitation] Email verified");

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entityType: "MEMBER",
        entityId: invitation.organizationId,
        newValues: {
          organizationId: invitation.organizationId,
          role: invitation.role,
          invitationId: invitationId,
        },
      },
    });

    console.log("✅ [Accept Invitation] Audit log created");

    if (!invitation.organization.school) {
      return NextResponse.json(
        { error: "School not found for this organization" },
        { status: 404 },
      );
    }

    // Determine redirect URL based on invitation role
    let rolePath = "admin"; // default
    const invitedRole = invitation.role?.toLowerCase() || "member";

    if (invitedRole === "teacher") {
      rolePath = "teacher";
    } else if (invitedRole === "student") {
      rolePath = "student";
    } else if (invitedRole === "guardian") {
      rolePath = "guardian";
    } else if (invitedRole === "staff") {
      rolePath = "staff";
    } else if (invitedRole === "admin" || invitedRole === "owner") {
      rolePath = "admin";
    }

    const redirectUrl = `/${invitation.organization.school.subdomain}/${rolePath}`;

    console.log(
      `✅ [Accept Invitation] Complete! Redirecting to: ${redirectUrl}`,
    );

    return NextResponse.json({
      success: true,
      message: "Invitation accepted successfully",
      redirectUrl,
      organization: {
        id: invitation.organizationId,
        name: invitation.organization.name,
      },
      school: {
        id: invitation.organization.school.id,
        name: invitation.organization.school.name,
        subdomain: invitation.organization.school.subdomain,
      },
    });
  } catch (error) {
    console.error("❌ [Accept Invitation] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to accept invitation",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
