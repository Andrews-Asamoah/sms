// app/auth/invite/[invitationId]/page.tsx - FIXED WITH PROPER TYPES

import prisma from "@/lib/prisma";
import { InviteAcceptForm } from "@/components/auth/invite-accept-form";
import Link from "next/link";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface InvitePageProps {
  params: Promise<{ invitationId: string }>;
}

interface InvitationWithRelations {
  id: string;
  email: string;
  role: string | null;
  status: string;
  expiresAt: Date;
  organization: {
    id: string;
    name: string;
    school: {
      name: string;
      subdomain: string;
      logo: string | null;
    } | null;
  };
  inviter: {
    name: string;
    email: string;
  };
}

interface InvitationData {
  email: string;
  schoolName: string;
  schoolLogo: string | null;
  inviterName: string;
  role: string | null;
  invitationId: string;
  organizationId: string;
  name?: string;
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default async function InvitePage({ params }: InvitePageProps) {
  const { invitationId } = await params;

  // ============================================================================
  // FETCH INVITATION
  // ============================================================================

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
              logo: true,
            },
          },
        },
      },
      inviter: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  // ============================================================================
  // VALIDATION
  // ============================================================================

  // Check if invitation exists
  if (!invitation) {
    return <InvalidInvitationView />;
  }

  // Check if invitation has expired
  const isExpired = new Date(invitation.expiresAt) < new Date();
  if (isExpired) {
    return <ExpiredInvitationView invitation={invitation} />;
  }

  // Check if invitation is already used
  if (invitation.status !== "pending") {
    return <UsedInvitationView />;
  }

  // ============================================================================
  // PREPARE INVITATION DATA
  // ============================================================================

  const invitationData: InvitationData = {
    email: invitation.email,
    schoolName:
      invitation.organization.school?.name || invitation.organization.name,
    schoolLogo: invitation.organization.school?.logo || null,
    inviterName: invitation.inviter.name,
    role: invitation.role || "member",
    invitationId: invitation.id,
    organizationId: invitation.organization.id,
  };

  // If this invitation is for a teacher, try to fetch their pre-filled name
  const pendingTeacher = await prisma.teacher.findFirst({
    where: {
      invitationEmail: invitation.email,
      schoolId: invitation.organization.school?.id,
    },
    select: {
      firstName: true,
      lastName: true,
    },
  });

  if (pendingTeacher?.firstName && pendingTeacher?.lastName) {
    invitationData.name = `${pendingTeacher.firstName} ${pendingTeacher.lastName}`;
  } else {
    // If no pending teacher, check the audit log for staff/admin invites
    const auditLog = await prisma.auditLog.findFirst({
      where: {
        entityType: "INVITATION",
        entityId: invitation.id,
        action: "CREATE",
      },
      orderBy: { createdAt: "desc" },
    });

    if (auditLog && auditLog.newValues) {
      const data = auditLog.newValues as any;
      if (data.firstName || data.lastName) {
        invitationData.name = [data.firstName, data.lastName].filter(Boolean).join(" ");
      }
    }
  }

  return <InviteAcceptForm invitation={invitationData} />;
}

// ============================================================================
// EXPIRED INVITATION VIEW
// ============================================================================

interface ExpiredInvitationViewProps {
  invitation: InvitationWithRelations;
}

function ExpiredInvitationView({ invitation }: ExpiredInvitationViewProps) {
  return (
    <div className="w-full max-w-md">
      <div className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-white/20 shadow-2xl rounded-lg p-8">
        <div className="text-center space-y-4">
          {/* Icon */}
          <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
            <svg
              className="h-8 w-8 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Invitation Expired
          </h1>

          {/* Message */}
          <div className="space-y-2">
            <p className="text-muted-foreground">
              This invitation expired on{" "}
              <strong>
                {new Date(invitation.expiresAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </strong>
            </p>
            <p className="text-muted-foreground">
              Please contact <strong>{invitation.inviter.name}</strong> (
              {invitation.inviter.email}) to request a new invitation.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-4 space-y-2">
            <Link
              href="/auth/login"
              className="block w-full px-4 py-2 text-center bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all"
            >
              Go to Login
            </Link>
            <Link
              href="/"
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// USED INVITATION VIEW
// ============================================================================

function UsedInvitationView() {
  return (
    <div className="w-full max-w-md">
      <div className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-white/20 shadow-2xl rounded-lg p-8">
        <div className="text-center space-y-4">
          {/* Icon */}
          <div className="h-16 w-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto">
            <svg
              className="h-8 w-8 text-yellow-600 dark:text-yellow-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Invitation Already Used
          </h1>

          {/* Message */}
          <p className="text-muted-foreground">
            This invitation has already been accepted. If you have an account,
            please sign in below.
          </p>

          {/* Actions */}
          <div className="pt-4 space-y-2">
            <Link
              href="/auth/login"
              className="block w-full px-4 py-2 text-center bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all"
            >
              Go to Login
            </Link>
            <Link
              href="/"
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// INVALID INVITATION VIEW
// ============================================================================

function InvalidInvitationView() {
  return (
    <div className="w-full max-w-md">
      <div className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-white/20 shadow-2xl rounded-lg p-8">
        <div className="text-center space-y-4">
          {/* Icon */}
          <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
            <svg
              className="h-8 w-8 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Invalid or Revoked Invitation
          </h1>

          {/* Message */}
          <p className="text-muted-foreground">
            This invitation link is invalid or has been revoked by the administrator. Please request a new invitation if you believe this is a mistake.
          </p>

          {/* Actions */}
          <div className="pt-4 space-y-2">
            <Link
              href="/auth/login"
              className="block w-full px-4 py-2 text-center bg-linear-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all"
            >
              Go to Login
            </Link>
            <Link
              href="/"
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// METADATA
// ============================================================================

export async function generateMetadata({ params }: InvitePageProps) {
  const { invitationId } = await params;

  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: {
      organization: {
        include: {
          school: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  const schoolName =
    invitation?.organization.school?.name || invitation?.organization.name;

  return {
    title: `Join ${schoolName || "School"}`,
    description: `You've been invited to join ${schoolName || "a school"}. Accept your invitation to get started.`,
  };
}
