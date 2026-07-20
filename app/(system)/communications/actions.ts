"use server";

import { getSession } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { sendBatchSimpleSMS } from "@/lib/messaging/hubtel";

export type SystemSMSFilter = "all" | "active" | "trialing" | "expired";

interface SendSystemSMSPayload {
  message: string;
  targetFilter: SystemSMSFilter;
}

interface SendSystemSMSResult {
  success: boolean;
  recipientCount?: number;
  sent?: number;
  failed?: number;
  batchId?: string;
  error?: string;
}

/**
 * Collect phone numbers of school owners/admins across all organizations
 * based on the target subscription filter
 */
async function collectSystemRecipients(
  filter: SystemSMSFilter
): Promise<string[]> {
  // Build the where clause for subscriptionStatus filtering
  let subscriptionStatusFilter: object | undefined;

  if (filter === "active") {
    subscriptionStatusFilter = { subscriptionStatus: "ACTIVE" };
  } else if (filter === "trialing") {
    subscriptionStatusFilter = { subscriptionStatus: "TRIALING" };
  } else if (filter === "expired") {
    subscriptionStatusFilter = {
      subscriptionStatus: { in: ["CANCELED", "UNPAID", "INCOMPLETE_EXPIRED", "PAST_DUE"] },
    };
  }

  const organizations = await prisma.organization.findMany({
    where: subscriptionStatusFilter,
    include: {
      members: {
        where: { role: { in: ["owner", "admin"] }, banned: false },
        include: {
          user: {
            include: {
              userProfile: { select: { phone: true, alternatePhone: true } },
            },
          },
        },
      },
    },
  });

  const phones: Set<string> = new Set();

  for (const org of organizations) {
    for (const member of org.members) {
      if (member.user.userProfile?.phone) {
        phones.add(member.user.userProfile.phone);
      }
    }
  }

  return Array.from(phones).filter(Boolean);
}

/**
 * Send a broadcast SMS to all school admins/owners (SuperAdmin only)
 */
export async function sendSystemBroadcastSMS(
  payload: SendSystemSMSPayload
): Promise<SendSystemSMSResult> {
  const session = await getSession();
  if (!session?.isSuperAdmin) {
    return { success: false, error: "Unauthorized. SuperAdmin access required." };
  }

  const { message, targetFilter } = payload;

  if (!message || message.trim().length === 0) {
    return { success: false, error: "Message cannot be empty" };
  }

  const phones = await collectSystemRecipients(targetFilter);

  if (phones.length === 0) {
    return {
      success: false,
      error: `No phone numbers found for filter: ${targetFilter}`,
    };
  }

  // Use platform Hubtel credentials for system broadcasts
  const result = await sendBatchSimpleSMS(phones, message.trim());

  // Log the broadcast
  prisma.systemSMSLog
    .create({
      data: {
        sentBy: session.user.id,
        message: message.trim(),
        targetFilter,
        recipientCount: phones.length,
        batchId: result.batchId ?? null,
        status: result.success
          ? (result.failed ?? 0) > 0
            ? "PARTIAL"
            : "SENT"
          : "FAILED",
        failedCount: result.failed ?? 0,
      },
    })
    .catch((e) => console.error("[SystemSMSLog] Failed to log broadcast:", e));

  if (!result.success) {
    return {
      success: false,
      error: result.error || "Broadcast failed",
      recipientCount: phones.length,
      sent: result.sent ?? 0,
      failed: result.failed ?? phones.length,
    };
  }

  return {
    success: true,
    recipientCount: phones.length,
    sent: result.sent,
    failed: result.failed,
    batchId: result.batchId,
  };
}

/**
 * Preview how many recipients a broadcast would reach
 */
export async function previewSystemRecipientCount(
  filter: SystemSMSFilter
): Promise<{ success: boolean; count?: number; error?: string }> {
  const session = await getSession();
  if (!session?.isSuperAdmin) {
    return { success: false, error: "Unauthorized" };
  }

  const phones = await collectSystemRecipients(filter);
  return { success: true, count: phones.length };
}

/**
 * Get system broadcast SMS history
 */
export async function getSystemSMSHistory() {
  const session = await getSession();
  if (!session?.isSuperAdmin) return { success: false, data: [] };

  const logs = await prisma.systemSMSLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return { success: true, data: logs };
}
