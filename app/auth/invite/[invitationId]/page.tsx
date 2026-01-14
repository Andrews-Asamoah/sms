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

  // Fetch invitation details
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: {
      organization: {
        include: {
          school: {
            select: {
              name: true,
              subdomain: true,
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

  // Check if invitation exists
  if (!invitation) {
    notFound();
  }

  // Check if invitation has expired
  const isExpired = new Date(invitation.expiresAt) < new Date();
  if (isExpired) {
    return (
      <div className="w-full max-w-md">
        <div className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-white/20 shadow-2xl rounded-lg p-8">
          <div className="text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
              <span className="text-2xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-bold">Invitation Expired</h1>
            <p className="text-muted-foreground">
              This invitation has expired. Please contact{" "}
              <strong>{invitation.inviter.name}</strong> to request a new
              invitation.
            </p>
            <div className="pt-4">
              <Link
                href="/auth/login"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                Go to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check if invitation is already used
  if (invitation.status !== "pending") {
    return (
      <div className="w-full max-w-md">
        <div className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-white/20 shadow-2xl rounded-lg p-8">
          <div className="text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto">
              <span className="text-2xl">ℹ️</span>
            </div>
            <h1 className="text-2xl font-bold">Invitation Already Used</h1>
            <p className="text-muted-foreground">
              This invitation has already been used. If you have an account,
              please log in.
            </p>
            <div className="pt-4">
              <Link
                href="/auth/login"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                Go to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Prepare invitation data for the form
  const invitationData = {
    email: invitation.email,
    schoolName:
      invitation.organization.school?.name || invitation.organization.name,
    inviterName: invitation.inviter.name,
    role: invitation.role || "member",
    invitationId: invitation.id,
  };

  return <InviteAcceptForm invitation={invitationData} />;
}

export async function generateMetadata({ params }: InvitePageProps) {
  const { invitationId } = await params;

  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: {
      organization: {
        include: {
          school: true,
        },
      },
    },
  });

  const schoolName =
    invitation?.organization.school?.name || invitation?.organization.name;

  return {
    title: `Join ${schoolName}`,
    description: `You've been invited to join ${schoolName}. Accept your invitation to get started.`,
  };
}
