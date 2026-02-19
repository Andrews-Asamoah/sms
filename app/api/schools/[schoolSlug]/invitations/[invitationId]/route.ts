import { getSession } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    schoolSlug: string;
    invitationId: string;
  }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { schoolSlug, invitationId } = await context.params;

    // Validate school access
    const school = await prisma.school.findFirst({
      where: {
        OR: [{ id: schoolSlug }, { subdomain: schoolSlug }],
      },
      include: {
        organization: {
          include: {
            members: {
              where: {
                userId: session.user.id,
              },
            },
          },
        },
      },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const isSuperAdmin = session.isSuperAdmin;
    const isOwnerOrAdmin = school.organization.members.some(
      (m) =>
        m.userId === session.user.id &&
        (m.role === "owner" || m.role === "admin"),
    );

    if (!isSuperAdmin && !isOwnerOrAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete the invitation
    // We also verify it belongs to the school's organization to be safe
    const invitation = await prisma.invitation.deleteMany({
      where: {
        id: invitationId,
        organizationId: school.organizationId,
      },
    });

    if (invitation.count === 0) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting invitation:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
