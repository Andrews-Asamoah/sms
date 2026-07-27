"use server";

import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendBatchSimpleSMS } from "@/lib/messaging/hubtel";
import { revalidatePath } from "next/cache";

export type SMSAudienceType = "guardians" | "teachers" | "staff" | "all";

export interface SingleRecipientOption {
  id: string;
  name: string;
  phone: string;
  role: "Guardian" | "Teacher" | "Staff";
  detail?: string;
}

interface SendSchoolSMSPayload {
  schoolId: string;
  schoolSlug: string;
  message: string;
  audienceTypes: SMSAudienceType[];
}

interface SendSingleSMSPayload {
  schoolId: string;
  schoolSlug: string;
  recipientName: string;
  recipientPhone: string;
  recipientRole: string; // "Guardian" | "Teacher" | "Staff" | "Custom"
  message: string;
}

interface SendSchoolSMSResult {
  success: boolean;
  recipientCount?: number;
  sent?: number;
  failed?: number;
  batchId?: string;
  error?: string;
}

/**
 * Collect phone numbers for the selected audience groups within a school.
 * Guardians → guardian.phone
 * Teachers  → teacher.profile.phone
 * Staff     → staff.profile.phone
 */
async function collectRecipients(
  schoolId: string,
  audienceTypes: SMSAudienceType[]
): Promise<string[]> {
  const phones: Set<string> = new Set();

  const includeGuardians =
    audienceTypes.includes("guardians") || audienceTypes.includes("all");
  const includeTeachers =
    audienceTypes.includes("teachers") || audienceTypes.includes("all");
  const includeStaff =
    audienceTypes.includes("staff") || audienceTypes.includes("all");

  const [guardians, teachers, staff] = await Promise.all([
    includeGuardians
      ? prisma.guardian.findMany({
          where: { schoolId, isActive: true, deletedAt: null },
          select: { phone: true, alternatePhone: true },
        })
      : [],
    includeTeachers
      ? prisma.teacher.findMany({
          where: { schoolId, isActive: true, deletedAt: null, profileId: { not: null } },
          select: {
            profile: {
              select: { phone: true, alternatePhone: true },
            },
          },
        })
      : [],
    includeStaff
      ? prisma.staff.findMany({
          where: { schoolId, isActive: true, deletedAt: null },
          select: {
            profile: {
              select: { phone: true, alternatePhone: true },
            },
          },
        })
      : [],
  ]);

  for (const g of guardians) {
    if (g.phone) phones.add(g.phone);
    if (g.alternatePhone) phones.add(g.alternatePhone);
  }
  for (const t of teachers) {
    if (t.profile?.phone) phones.add(t.profile.phone);
    if (t.profile?.alternatePhone) phones.add(t.profile.alternatePhone);
  }
  for (const s of staff) {
    if (s.profile?.phone) phones.add(s.profile.phone);
    if (s.profile?.alternatePhone) phones.add(s.profile.alternatePhone);
  }

  return Array.from(phones).filter(Boolean);
}

/**
 * Helper to verify school authorization for SMS operations
 */
async function checkSchoolAuthorization(
  schoolId: string,
  userId: string,
  isSuperAdmin?: boolean
) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { organizationId: true, settings: true },
  });
  if (!school) return { authorized: false, school: null };

  const member = await prisma.member.findUnique({
    where: {
      organizationId_userId: {
        organizationId: school.organizationId,
        userId,
      },
    },
    select: { role: true },
  });

  const authorized =
    Boolean(isSuperAdmin) ||
    Boolean(
      member && (member.role.includes("owner") || member.role.includes("admin"))
    );

  return { authorized, school };
}

/**
 * Send a bulk SMS to selected audience groups within a school.
 * Supports both platform credentials and school's custom Hubtel credentials.
 */
export async function sendSchoolSMS(
  payload: SendSchoolSMSPayload
): Promise<SendSchoolSMSResult> {
  const session = await getAuthSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const { schoolId, schoolSlug, message, audienceTypes } = payload;

  if (!message || message.trim().length === 0) {
    return { success: false, error: "Message cannot be empty" };
  }
  if (!audienceTypes || audienceTypes.length === 0) {
    return { success: false, error: "Please select at least one audience group" };
  }

  const { authorized, school } = await checkSchoolAuthorization(
    schoolId,
    session.user.id,
    session.isSuperAdmin
  );

  if (!authorized || !school) {
    return { success: false, error: "Permission denied or school not found" };
  }

  // Resolve SMS config: use school's custom credentials if configured
  const settings = (school.settings as Record<string, unknown>) || {};
  const hubtelConfig = {
    useCustomSMS: Boolean(settings.useCustomSMS),
    hubtelClientId: settings.hubtelClientId as string | null,
    hubtelClientSecret: settings.hubtelClientSecret as string | null,
    hubtelSenderId: settings.hubtelSenderId as string | null,
  };

  // Collect phone numbers
  const phones = await collectRecipients(schoolId, audienceTypes);
  if (phones.length === 0) {
    return {
      success: false,
      error: "No phone numbers found for the selected audience groups",
    };
  }

  // Determine sender ID label for log
  const senderId =
    (hubtelConfig.useCustomSMS && hubtelConfig.hubtelSenderId) ||
    process.env.HUBTEL_SENDER_ID ||
    "SchoolMS";

  // Send via Hubtel batch endpoint
  const result = await sendBatchSimpleSMS(
    phones,
    message.trim(),
    hubtelConfig.useCustomSMS ? hubtelConfig : undefined
  );

  // Log the send to SMSLog
  prisma.sMSLog
    .create({
      data: {
        schoolId,
        sentBy: session.user.id,
        audienceType:
          audienceTypes.length > 1 ? "all" : audienceTypes[0] ?? "all",
        recipientCount: phones.length,
        message: message.trim(),
        senderId,
        batchId: result.batchId ?? null,
        status: result.success
          ? result.failed && result.failed > 0
            ? "PARTIAL"
            : "SENT"
          : "FAILED",
        failedCount: result.failed ?? 0,
      },
    })
    .catch((e) => console.error("[SMSLog] Failed to log SMS:", e));

  revalidatePath(`/${schoolSlug}/admin/communications/messages`);

  if (!result.success) {
    return {
      success: false,
      error: result.error || "SMS delivery failed",
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
 * Send an SMS to a single recipient (Parent, Teacher, Staff, or Custom Phone Number).
 */
export async function sendSingleSchoolSMS(
  payload: SendSingleSMSPayload
): Promise<SendSchoolSMSResult> {
  const session = await getAuthSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const { schoolId, schoolSlug, recipientName, recipientPhone, recipientRole, message } =
    payload;

  if (!message || message.trim().length === 0) {
    return { success: false, error: "Message cannot be empty" };
  }
  if (!recipientPhone || recipientPhone.trim().length === 0) {
    return { success: false, error: "Recipient phone number is required" };
  }

  const { authorized, school } = await checkSchoolAuthorization(
    schoolId,
    session.user.id,
    session.isSuperAdmin
  );

  if (!authorized || !school) {
    return { success: false, error: "Permission denied or school not found" };
  }

  const settings = (school.settings as Record<string, unknown>) || {};
  const hubtelConfig = {
    useCustomSMS: Boolean(settings.useCustomSMS),
    hubtelClientId: settings.hubtelClientId as string | null,
    hubtelClientSecret: settings.hubtelClientSecret as string | null,
    hubtelSenderId: settings.hubtelSenderId as string | null,
  };

  const senderId =
    (hubtelConfig.useCustomSMS && hubtelConfig.hubtelSenderId) ||
    process.env.HUBTEL_SENDER_ID ||
    "SchoolMS";

  const targetPhone = recipientPhone.trim();

  // Send single SMS using batch simple endpoint with 1 recipient for consistency
  const result = await sendBatchSimpleSMS(
    [targetPhone],
    message.trim(),
    hubtelConfig.useCustomSMS ? hubtelConfig : undefined
  );

  const audienceLabel = `single:${recipientRole.toLowerCase()}:${recipientName || targetPhone}`;

  // Log to SMSLog
  prisma.sMSLog
    .create({
      data: {
        schoolId,
        sentBy: session.user.id,
        audienceType: audienceLabel,
        recipientCount: 1,
        message: message.trim(),
        senderId,
        batchId: result.batchId ?? null,
        status: result.success ? "SENT" : "FAILED",
        failedCount: result.success ? 0 : 1,
      },
    })
    .catch((e) => console.error("[SMSLog] Failed to log single SMS:", e));

  revalidatePath(`/${schoolSlug}/admin/communications/messages`);

  if (!result.success) {
    return {
      success: false,
      error: result.error || "SMS delivery failed",
      recipientCount: 1,
      sent: 0,
      failed: 1,
    };
  }

  return {
    success: true,
    recipientCount: 1,
    sent: 1,
    failed: 0,
    batchId: result.batchId,
  };
}

/**
 * Search guardians, teachers, and staff in a school for single SMS sending
 */
export async function searchSchoolRecipients(
  schoolId: string,
  query: string
): Promise<{ success: boolean; data: SingleRecipientOption[]; error?: string }> {
  const session = await getAuthSession();
  if (!session) return { success: false, error: "Unauthorized", data: [] };

  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return { success: true, data: [] };

  try {
    const [guardians, teachers, staff] = await Promise.all([
      // Guardians
      prisma.guardian.findMany({
        where: {
          schoolId,
          isActive: true,
          deletedAt: null,
          OR: [
            { firstName: { contains: cleanQuery, mode: "insensitive" } },
            { lastName: { contains: cleanQuery, mode: "insensitive" } },
            { phone: { contains: cleanQuery } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          relationshipType: true,
        },
        take: 10,
      }),
      // Teachers
      prisma.teacher.findMany({
        where: {
          schoolId,
          isActive: true,
          deletedAt: null,
          OR: [
            { firstName: { contains: cleanQuery, mode: "insensitive" } },
            { lastName: { contains: cleanQuery, mode: "insensitive" } },
            {
              profile: {
                OR: [
                  { firstName: { contains: cleanQuery, mode: "insensitive" } },
                  { lastName: { contains: cleanQuery, mode: "insensitive" } },
                  { phone: { contains: cleanQuery } },
                ],
              },
            },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          specialization: true,
          profile: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
        take: 10,
      }),
      // Staff
      prisma.staff.findMany({
        where: {
          schoolId,
          isActive: true,
          deletedAt: null,
          profile: {
            OR: [
              { firstName: { contains: cleanQuery, mode: "insensitive" } },
              { lastName: { contains: cleanQuery, mode: "insensitive" } },
              { phone: { contains: cleanQuery } },
            ],
          },
        },
        select: {
          id: true,
          jobTitle: true,
          profile: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
        take: 10,
      }),
    ]);

    const options: SingleRecipientOption[] = [];

    for (const g of guardians) {
      if (g.phone) {
        options.push({
          id: `g_${g.id}`,
          name: `${g.firstName} ${g.lastName}`,
          phone: g.phone,
          role: "Guardian",
          detail: g.relationshipType ? `Parent / ${g.relationshipType}` : "Parent",
        });
      }
    }

    for (const t of teachers) {
      const name =
        t.profile
          ? `${t.profile.firstName} ${t.profile.lastName}`
          : `${t.firstName || ''} ${t.lastName || ''}`.trim() || "Teacher";
      const phone = t.profile?.phone;
      if (phone) {
        options.push({
          id: `t_${t.id}`,
          name,
          phone,
          role: "Teacher",
          detail: t.specialization ? `Teacher (${t.specialization})` : "Teacher",
        });
      }
    }

    for (const s of staff) {
      if (s.profile?.phone) {
        options.push({
          id: `s_${s.id}`,
          name: `${s.profile.firstName} ${s.profile.lastName}`,
          phone: s.profile.phone,
          role: "Staff",
          detail: s.jobTitle || "School Staff",
        });
      }
    }

    return { success: true, data: options };
  } catch (error) {
    console.error("[searchSchoolRecipients] Search error:", error);
    return { success: false, error: "Failed to search recipients", data: [] };
  }
}

/**
 * Get SMS history for a school
 */
export async function getSchoolSMSHistory(schoolId: string) {
  const session = await getAuthSession();
  if (!session) return { success: false, error: "Unauthorized", data: [] };

  const logs = await prisma.sMSLog.findMany({
    where: { schoolId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return { success: true, data: logs };
}

/**
 * Get recipient count preview for selected audience types (without sending)
 */
export async function previewSMSRecipientCount(
  schoolId: string,
  audienceTypes: SMSAudienceType[]
): Promise<{ success: boolean; count?: number; error?: string }> {
  const session = await getAuthSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const { authorized } = await checkSchoolAuthorization(
    schoolId,
    session.user.id,
    session.isSuperAdmin
  );
  if (!authorized) return { success: false, error: "Permission denied" };

  const phones = await collectRecipients(schoolId, audienceTypes);
  return { success: true, count: phones.length };
}
