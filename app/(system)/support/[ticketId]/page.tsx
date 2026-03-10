import { requireSuperAdmin } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { TicketDetailClient } from "@/components/System/Support/ticket-detail-client";

interface TicketDetailPageProps {
  params: Promise<{ ticketId: string }>;
}

export default async function TicketDetailPage({
  params,
}: TicketDetailPageProps) {
  const session = await requireSuperAdmin();
  const { ticketId } = await params;

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      submittedBy: {
        select: { id: true, name: true, email: true, image: true, role: true },
      },
      school: { select: { name: true, subdomain: true } },
      assignedTo: { select: { id: true, name: true } },
      replies: {
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!ticket) notFound();

  // Superadmins to assign to
  const superAdmins = await prisma.user.findMany({
    where: { role: "superAdmin" },
    select: { id: true, name: true },
  });

  return (
    <TicketDetailClient
      ticket={ticket as any}
      superAdmins={superAdmins}
      currentUserId={session.user.id}
    />
  );
}
