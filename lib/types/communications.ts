// lib/types/communications.ts
// Shared types used by both server actions and client components
// to avoid "use server" boundary import issues.

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

export interface CommunicationHistoryFilters {
  channel: CommChannel;
  status: CommStatus;
  search: string;
  page: number;
}
