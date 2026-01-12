// app/api/invitations/[invitationId]/accept/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { MemberRole } from "@/lib/generated/prisma/client";

type RouteContext = {
  params: Promise<{
    invitationId: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json(
        { error: "You must be logged in to accept an invitation" },
        { status: 401 }
      );
    }

    const params = await context.params;
    const { invitationId } = params;

    // Find the invitation by ID
    const invitation = await prisma.invitation.findUnique({
      where: {
        id: invitationId,
      },
      include: {
        organization: {
          include: {
            school: true,
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 404 }
      );
    }

    // Check if invitation is pending
    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: `This invitation has been ${invitation.status}` },
        { status: 400 }
      );
    }

    // Check if invitation has expired
    if (new Date(invitation.expiresAt) < new Date()) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "expired" },
      });
      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 400 }
      );
    }

    // Check if email matches
    if (session.user.email !== invitation.email) {
      return NextResponse.json(
        {
          error: `This invitation was sent to ${invitation.email}. Please log in with that email address.`,
        },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const existingMember = await prisma.member.findFirst({
      where: {
        userId: session.user.id,
        organizationId: invitation.organizationId,
      },
    });

    if (existingMember) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "accepted" },
      });

      return NextResponse.json({
        message: "You are already a member of this organization",
        redirectUrl: `/${invitation.organization.school?.subdomain}/admin/dashboard`,
      });
    }

    // Parse role from invitation
    let memberRole: MemberRole;
    const invitationRole = (invitation.role || "member").toUpperCase();

    if (invitationRole === "OWNER") {
      memberRole = MemberRole.OWNER;
    } else if (invitationRole === "ADMIN") {
      memberRole = MemberRole.ADMIN;
    } else {
      memberRole = MemberRole.MEMBER;
    }

    // Create member and update invitation in a transaction
    await prisma.$transaction([
      prisma.member.create({
        data: {
          userId: session.user.id,
          organizationId: invitation.organizationId,
          role: memberRole,
        },
      }),
      prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "accepted" },
      }),
    ]);

    return NextResponse.json({
      message: "Invitation accepted successfully",
      redirectUrl: `/${invitation.organization.school?.subdomain}/admin/dashboard`,
    });
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json(
      { error: "Failed to accept invitation" },
      { status: 500 }
    );
  }
}
