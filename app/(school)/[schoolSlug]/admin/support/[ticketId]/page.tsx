import { requireAuth } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { AdminTicketThreadView } from "@/components/school/Support/ticket-thread-view";

export const dynamic = "force-dynamic";

export default async function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ schoolSlug: string; ticketId: string }>;
}) {
  const { schoolSlug, ticketId } = await params;
  const session = await requireAuth();

  const ticket = await prisma.supportTicket.findFirst({
    where: {
      id: ticketId,
      school: { subdomain: schoolSlug },
    },
    include: {
      submittedBy: {
        select: { id: true, name: true, email: true, image: true, role: true },
      },
      school: { select: { name: true, subdomain: true } },
      assignedTo: { select: { name: true } },
      replies: {
        include: {
          author: {
            select: { id: true, name: true, image: true, role: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!ticket) notFound();

  return (
    <AdminTicketThreadView
      ticket={ticket as any}
      schoolSlug={schoolSlug}
      currentUserId={session.user.id}
    />
  );
}
