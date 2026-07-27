"use server";

import { getAuthSession } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma";

export type CommChannel = "ALL" | "SMS" | "EMAIL";
export type CommStatus = "ALL" | "SENT" | "FAILED" | "PARTIAL";

export interface UnifiedCommItem {
  id: string;
  channel: "SMS" | "EMAIL";
  /** Human-readable label: phone number, email address, or "N recipients (audience)" */
  recipient: string;
  recipientName?: string | null;
  /** Email subject or SMS audience label */
  subjectOrTitle: string;
  /** Full message body for SMS; email subject for emails */
  messagePreview: string;
  /** "ANNOUNCEMENT" | "FEE_REMINDER" | "INVITATION" | audience label */
  category: string;
  status: "SENT" | "FAILED" | "PARTIAL";
  /** Who triggered the send */
  sentBy?: string | null;
  /** Number of recipients that failed */
  failedCount?: number;
  /** Hubtel batch ID for bulk SMS */
  batchId?: string | null;
  createdAt: Date;
}

export interface CommunicationStats {
  totalSMS: number;
  totalSMSRecipients: number;
  totalEmails: number;
  totalAnnouncements: number;
  failedSMS: number;
  failedEmails: number;
}

/**
 * Get aggregated stats for the communications overview hub
 */
export async function getCommunicationStats(
  schoolId: string
): Promise<{ success: boolean; stats?: CommunicationStats; error?: string }> {
  const session = await getAuthSession();
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    const [smsAgg, emailCount, emailFailedCount, announcementCount] =
      await Promise.all([
        prisma.sMSLog.aggregate({
          where: { schoolId },
          _count: { _all: true },
          _sum: { recipientCount: true, failedCount: true },
        }),
        prisma.emailLog.count({ where: { schoolId } }),
        prisma.emailLog.count({ where: { schoolId, status: "FAILED" } }),
        prisma.announcement.count({ where: { schoolId } }),
      ]);

    return {
      success: true,
      stats: {
        totalSMS: smsAgg._count._all,
        totalSMSRecipients: smsAgg._sum.recipientCount ?? 0,
        totalEmails: emailCount,
        totalAnnouncements: announcementCount,
        failedSMS: smsAgg._sum.failedCount ?? 0,
        failedEmails: emailFailedCount,
      },
    };
  } catch (err) {
    console.error("❌ getCommunicationStats error:", err);
    return { success: false, error: "Failed to load stats" };
  }
}

/**
 * Fetch unified communication history (SMS + Emails) for a school.
 * All filtering is done server-side via Prisma WHERE clauses.
 */
export async function getUnifiedCommunicationHistory(params: {
  schoolId: string;
  channel?: CommChannel;
  status?: CommStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  success: boolean;
  data: UnifiedCommItem[];
  totalCount: number;
  error?: string;
}> {
  const session = await getAuthSession();
  if (!session)
    return { success: false, error: "Unauthorized", data: [], totalCount: 0 };

  const {
    schoolId,
    channel = "ALL",
    status = "ALL",
    search = "",
    page = 1,
    pageSize = 50,
  } = params;

  const cleanSearch = search.trim();
  const fetchSMS = channel === "ALL" || channel === "SMS";
  const fetchEmail = channel === "ALL" || channel === "EMAIL";

  try {
    // ── SMS where ──────────────────────────────────────────────────────────
    const smsWhere: Prisma.SMSLogWhereInput = {
      schoolId,
      ...(status !== "ALL" ? { status } : {}),
      ...(cleanSearch
        ? {
            OR: [
              { audienceType: { contains: cleanSearch, mode: "insensitive" } },
              { message: { contains: cleanSearch, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    // ── Email where ────────────────────────────────────────────────────────
    const emailWhere: Prisma.EmailLogWhereInput = {
      schoolId,
      ...(status !== "ALL" ? { status } : {}),
      ...(cleanSearch
        ? {
            OR: [
              { recipientEmail: { contains: cleanSearch, mode: "insensitive" } },
              { recipientName: { contains: cleanSearch, mode: "insensitive" } },
              { subject: { contains: cleanSearch, mode: "insensitive" } },
              { category: { contains: cleanSearch, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    // ── Fetch data ─────────────────────────────────────────────────────────
    const [smsLogs, emailLogs, smsTotal, emailTotal] = await Promise.all([
      fetchSMS
        ? prisma.sMSLog.findMany({
            where: smsWhere,
            orderBy: { createdAt: "desc" },
            take: 200,
          })
        : Promise.resolve([]),
      fetchEmail
        ? prisma.emailLog.findMany({
            where: emailWhere,
            orderBy: { createdAt: "desc" },
            take: 200,
          })
        : Promise.resolve([]),
      fetchSMS ? prisma.sMSLog.count({ where: smsWhere }) : Promise.resolve(0),
      fetchEmail
        ? prisma.emailLog.count({ where: emailWhere })
        : Promise.resolve(0),
    ]);

    // ── Normalise into unified shape ───────────────────────────────────────
    const items: UnifiedCommItem[] = [];

    for (const log of smsLogs) {
      const isSingle = log.audienceType.startsWith("single:");
      const parts = log.audienceType.split(":");
      const phone = isSingle ? parts[2] : undefined;
      const name = isSingle ? parts.slice(3).join(":") || undefined : undefined;

      items.push({
        id: `sms_${log.id}`,
        channel: "SMS",
        recipient: isSingle
          ? (phone ?? log.audienceType)
          : `${log.recipientCount.toLocaleString()} recipients`,
        recipientName: isSingle ? (name ?? null) : null,
        subjectOrTitle: isSingle
          ? `Direct SMS → ${name ?? phone}`
          : `Bulk SMS · ${formatAudienceLabel(log.audienceType)}`,
        messagePreview: log.message,
        category: isSingle ? "DIRECT" : formatAudienceLabel(log.audienceType),
        status: log.status as UnifiedCommItem["status"],
        sentBy: log.senderId,
        failedCount: log.failedCount,
        batchId: log.batchId,
        createdAt: log.createdAt,
      });
    }

    for (const email of emailLogs) {
      items.push({
        id: `email_${email.id}`,
        channel: "EMAIL",
        recipient: email.recipientEmail,
        recipientName: email.recipientName,
        subjectOrTitle: email.subject,
        messagePreview: email.subject,
        category: email.category,
        status: email.status as UnifiedCommItem["status"],
        sentBy: null,
        createdAt: email.createdAt,
      });
    }

    // Merge-sort descending by createdAt
    items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Paginate
    const totalCount = smsTotal + emailTotal;
    const offset = (page - 1) * pageSize;
    const paginated = items.slice(offset, offset + pageSize);

    return { success: true, data: paginated, totalCount };
  } catch (err) {
    console.error("❌ getUnifiedCommunicationHistory error:", err);
    return {
      success: false,
      error: "Failed to load communication history",
      data: [],
      totalCount: 0,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAudienceLabel(audienceType: string): string {
  const map: Record<string, string> = {
    guardians: "Guardians / Parents",
    teachers: "Teachers",
    staff: "Staff",
    all: "Everyone",
  };
  return map[audienceType] ?? audienceType;
}
