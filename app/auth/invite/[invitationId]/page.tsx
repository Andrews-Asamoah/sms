// app/auth/invite/[invitationId]/page.tsx

import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { InviteAcceptForm } from "@/components/auth/invite-accept-form";
import Link from "next/link";

interface InvitePageProps {
  params: Promise<{ invitationId: string }>;
}

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
    notFound();
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

  const invitationData = {
    email: invitation.email,
    schoolName:
      invitation.organization.school?.name || invitation.organization.name,
    schoolLogo: invitation.organization.school?.logo,
    inviterName: invitation.inviter.name,
    role: invitation.role || "member",
    invitationId: invitation.id,
    organizationId: invitation.organization.id,
  };

  return <InviteAcceptForm invitation={invitationData} />;
}

// ============================================================================
// EXPIRED INVITATION VIEW
// ============================================================================

function ExpiredInvitationView({ invitation }: { invitation: any }) {
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
              className="block w-full px-4 py-2 text-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all"
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
              className="block w-full px-4 py-2 text-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition-all"
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
