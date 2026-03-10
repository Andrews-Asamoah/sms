"use server";

import { requireSuperAdmin } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { TicketStatus } from "@/lib/generated/prisma";

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus,
) {
  try {
    await requireSuperAdmin();
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status },
    });
    revalidatePath("/support");
    revalidatePath(`/support/${ticketId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addTicketReply(ticketId: string, message: string) {
  try {
    const session = await requireSuperAdmin();
    await prisma.ticketReply.create({
      data: {
        ticketId,
        authorId: session.user.id,
        message,
      },
    });
    // Auto-move to in-progress when first reply
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });
    if (ticket?.status === "OPEN") {
      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: "IN_PROGRESS" },
      });
    }
    revalidatePath(`/support/${ticketId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createSupportTicket(data: {
  subject: string;
  description: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  schoolId?: string;
}) {
  try {
    const session = await requireSuperAdmin();
    const ticket = await prisma.supportTicket.create({
      data: {
        subject: data.subject,
        description: data.description,
        priority: data.priority || "MEDIUM",
        schoolId: data.schoolId,
        submittedById: session.user.id,
      },
    });
    revalidatePath("/support");
    return { success: true, ticketId: ticket.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
