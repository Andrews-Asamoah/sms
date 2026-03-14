import { requireAuth } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SupportTicketForm } from "@/components/school/Support/support-ticket-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  return { title: "New Support Ticket" };
}

export default async function NewSupportTicketPage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  await requireAuth();

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true, name: true },
  });
  if (!school) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          New Support Ticket
        </h1>
        <p className="text-muted-foreground mt-1">
          Describe your issue and our team will respond as soon as possible.
        </p>
      </div>
      <SupportTicketForm schoolId={school.id} schoolSlug={schoolSlug} />
    </div>
  );
}
