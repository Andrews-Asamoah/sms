import { requireAuth } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { AdminTicketThreadView } from "@/components/school/Support/ticket-thread-view";

export const dynamic = "force-dynamic";

export default async function GuardianSupportDetailPage({
  params,
}: {
  params: Promise<{ schoolSlug: string; ticketId: string }>;
}) {
  const { schoolSlug, ticketId } = await params;
  const session = await requireAuth();

  const ticket = await prisma.supportTicket.findFirst({
    where: { 
      id: ticketId,
      submittedById: session.user.id,
      school: { subdomain: schoolSlug }
    },
    include: {
      submittedBy: { select: { name: true, image: true, id: true } },
      assignedTo: { select: { name: true, image: true, id: true } },
      replies: {
        include: {
          author: { select: { name: true, image: true, role: true, id: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!ticket) notFound();

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <AdminTicketThreadView 
        ticket={ticket} 
        schoolSlug={schoolSlug} 
        currentUserId={session.user.id}
      />
    </div>
  );
}
