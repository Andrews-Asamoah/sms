// app/(auth)/invite/[invitationId]/page.tsx
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InviteAcceptForm } from "@/components/auth/invite-accept-form";

interface PageProps {
  params: Promise<{ invitationId: string }>;
}

export default async function InvitePage({ params }: PageProps) {
  const { invitationId } = await params;
  const session = await getAuthSession();

  // Find the invitation by ID with proper includes
  const invitation = await prisma.invitation.findUnique({
    where: {
      id: invitationId,
    },
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
      inviter: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  // Check if invitation exists
  if (!invitation) {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid or has already been used
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The invitation you&apos;re trying to access doesn&apos;t exist
                or has already been accepted.
              </AlertDescription>
            </Alert>
            <Button asChild className="w-full mt-4">
              <Link href="/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if invitation is not pending
  if (invitation.status !== "pending") {
    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>
              Invitation{" "}
              {invitation.status === "accepted"
                ? "Already Accepted"
                : "No Longer Valid"}
            </CardTitle>
            <CardDescription>
              This invitation has been {invitation.status}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {invitation.status === "accepted"
                  ? "This invitation has already been accepted. Please sign in to access your account."
                  : `This invitation has been ${invitation.status} and is no longer valid.`}
              </AlertDescription>
            </Alert>
            <Button asChild className="w-full mt-4">
              <Link href="/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if invitation has expired
  if (new Date(invitation.expiresAt) < new Date()) {
    // Update status to expired
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "expired" },
    });

    return (
      <div className="container flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invitation Expired</CardTitle>
            <CardDescription>This invitation has expired</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This invitation expired on{" "}
                {new Date(invitation.expiresAt).toLocaleDateString()}. Please
                contact the school administrator for a new invitation.
              </AlertDescription>
            </Alert>
            <Button asChild className="w-full mt-4">
              <Link href="/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If user is logged in
  if (session) {
    // Check if email matches
    if (session.user.email !== invitation.email) {
      return (
        <div className="container flex items-center justify-center min-h-screen">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Email Mismatch</CardTitle>
              <CardDescription>Wrong account</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This invitation was sent to {invitation.email}, but
                  you&apos;re logged in as {session.user.email}. Please log out
                  and sign in with the correct account.
                </AlertDescription>
              </Alert>
              <div className="flex gap-2 mt-4">
                <Button asChild variant="outline" className="flex-1">
                  <Link href="/api/auth/sign-out">Log Out</Link>
                </Button>
                <Button asChild className="flex-1">
                  <Link href="/login">Switch Account</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Accept invitation automatically
    const roleString = (invitation.role || "member").toUpperCase();
    const memberRole =
      roleString === "OWNER"
        ? "OWNER"
        : roleString === "ADMIN"
          ? "ADMIN"
          : "MEMBER";

    await prisma.$transaction([
      prisma.member.create({
        data: {
          userId: session.user.id,
          organizationId: invitation.organizationId,
          role: memberRole as "OWNER" | "ADMIN" | "MEMBER",
        },
      }),
      prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "accepted" },
      }),
    ]);

    // Redirect to school - with fallback if school doesn't exist
    const subdomain = invitation.organization.school?.subdomain;
    if (subdomain) {
      redirect(`/${subdomain}/admin/dashboard`);
    } else {
      redirect("/dashboard");
    }
  }

  // Show signup/login form
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InviteAcceptForm
        invitation={{
          email: invitation.email,
          schoolName: invitation.organization.school?.name || "School",
          inviterName:
            invitation.inviter?.name ||
            invitation.inviter?.email ||
            "Administrator",
          role: invitation.role || "member",
          invitationId: invitationId,
        }}
      />
    </Suspense>
  );
}
