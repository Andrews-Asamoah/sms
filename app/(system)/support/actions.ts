"use server";

import { requireAuth, requireSuperAdmin } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { TicketStatus } from "@prisma/client";
import { redirect } from "next/navigation";

// ─── Superadmin: update status ───────────────────────────────────────────────

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus,
) {
  try {
    await requireSuperAdmin();

    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status },
      include: { school: { select: { subdomain: true } } },
    });

    // Notify ticket creator
    await prisma.notification.create({
      data: {
        schoolId: ticket.schoolId || "",
        userId: ticket.submittedById,
        type: "GENERAL",
        title: "Ticket Status Updated",
        message: `Your ticket "${ticket.subject}" status has been updated to ${status}.`,
        link: ticket.school?.subdomain 
          ? `/${ticket.school.subdomain}/admin/support/${ticketId}`
          : `/support/${ticketId}`,
      },
    });

    revalidatePath("/support");
    revalidatePath(`/support/${ticketId}`);
    if (ticket.school?.subdomain) {
      revalidatePath(`/${ticket.school.subdomain}/admin/support/${ticketId}`);
      revalidatePath(`/${ticket.school.subdomain}/admin/support`);
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── Superadmin: assign ticket ────────────────────────────────────────────────

export async function assignTicket(
  ticketId: string,
  assignedToId: string | null,
) {
  try {
    await requireSuperAdmin();
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { assignedToId },
    });
    revalidatePath(`/support/${ticketId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── Superadmin: add reply ────────────────────────────────────────────────────

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

    // Auto-move to IN_PROGRESS when first reply
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { school: { select: { subdomain: true } } },
    });
    if (ticket?.status === "OPEN") {
      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: "IN_PROGRESS" },
      });
    }

    // Notify ticket creator
    if (ticket) {
      await prisma.notification.create({
        data: {
          schoolId: ticket.schoolId || "",
          userId: ticket.submittedById,
          type: "GENERAL",
          title: "New Ticket Reply",
          message: `A superadmin has replied to your ticket: "${ticket.subject}"`,
          link: ticket.school?.subdomain 
            ? `/${ticket.school.subdomain}/admin/support/${ticketId}`
            : `/support/${ticketId}`,
        },
      });
    }

    revalidatePath(`/support/${ticketId}`);
    if (ticket?.school?.subdomain) {
      revalidatePath(`/${ticket.school.subdomain}/admin/support/${ticketId}`);
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── School Admin: create ticket ─────────────────────────────────────────────

export async function createSupportTicket(data: {
  subject: string;
  description: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  schoolId: string;
  schoolSlug: string;
}) {
  try {
    const session = await requireAuth();

    const ticket = await prisma.supportTicket.create({
      data: {
        subject: data.subject,
        description: data.description,
        priority: data.priority || "MEDIUM",
        schoolId: data.schoolId,
        submittedById: session.user.id,
      },
    });

    // Notify all superadmins
    const superAdmins = await prisma.user.findMany({
      where: { role: "superAdmin" },
      select: { id: true },
    });

    if (superAdmins.length > 0) {
      await prisma.notification.createMany({
        data: superAdmins.map((admin) => ({
          schoolId: data.schoolId,
          userId: admin.id,
          type: "GENERAL",
          title: "New Support Ticket",
          message: `A new ticket "${data.subject}" has been submitted.`,
          link: `/support/${ticket.id}`,
        })),
      });
    }

    revalidatePath(`/${data.schoolSlug}/admin/support`);
    return { success: true, ticketId: ticket.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── School Admin: reply to ticket ───────────────────────────────────────────

export async function addAdminReply(
  ticketId: string,
  message: string,
  schoolSlug: string,
) {
  try {
    const session = await requireAuth();

    // Verify admin has access to this ticket (belongs to their school)
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        school: { subdomain: schoolSlug },
      },
    });
    if (!ticket) return { success: false, error: "Ticket not found." };

    await prisma.ticketReply.create({
      data: {
        ticketId,
        authorId: session.user.id,
        message,
      },
    });

    // If RESOLVED, move to IN_PROGRESS on reply (admin is querying it)
    if (ticket.status === "RESOLVED") {
      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: "IN_PROGRESS" },
      });
    }

    revalidatePath(`/${schoolSlug}/admin/support/${ticketId}`);
    revalidatePath(`/support/${ticketId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── School Admin: confirm resolution (close ticket) ─────────────────────────

export async function confirmResolution(ticketId: string, schoolSlug: string) {
  try {
    await requireAuth();

    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: "CLOSED" },
    });

    revalidatePath(`/${schoolSlug}/admin/support`);
    revalidatePath(`/${schoolSlug}/admin/support/${ticketId}`);
    revalidatePath(`/support/${ticketId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── School Admin: reopen ticket ─────────────────────────────────────────────

export async function reopenTicket(ticketId: string, schoolSlug: string) {
  try {
    await requireAuth();

    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: "OPEN" },
    });

    revalidatePath(`/${schoolSlug}/admin/support`);
    revalidatePath(`/${schoolSlug}/admin/support/${ticketId}`);
    revalidatePath(`/support/${ticketId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
