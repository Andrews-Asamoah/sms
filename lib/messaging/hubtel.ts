/**
 * Hubtel SMS Gateway service
 * Documentation: https://developers.hubtel.com/docs/sending-a-message
 * Uses HTTP Basic Auth: clientId:clientSecret
 *
 * API Base: https://sms.hubtel.com/v1/messages
 */

// ============================================================================
// TYPES
// ============================================================================

export interface HubtelConfig {
  useCustomSMS?: boolean;
  hubtelClientId?: string | null;
  hubtelClientSecret?: string | null;
  hubtelSenderId?: string | null;
}

export interface HubtelSMSResult {
  success: boolean;
  messageId?: string;
  rate?: number;
  status?: string;
  error?: string;
  errorCode?: number;
}

export interface HubtelBatchResult {
  success: boolean;
  batchId?: string;
  sent: number;
  failed: number;
  error?: string;
  errorCode?: number;
  data?: { recipient: string; messageId: string; content: string }[];
}

interface HubtelSingleResponse {
  rate?: number;
  messageId?: string;
  status?: number;
  networkId?: string;
  clientReference?: string | null;
  statusDescription?: string | null;
  // Some error shapes
  message?: string;
}

interface HubtelBatchSimpleResponse {
  batchId?: string | null;
  status?: number;
  data?:
    | {
        recipient: string;
        content: string;
        messageId: string;
      }[]
    | null;
}

interface HubtelMessageStatusResponse {
  rate?: number;
  batchId?: string | null;
  messageId?: string;
  content?: string;
  status?: string;
  updateTime?: string;
  time?: string;
  to?: string;
  from?: string;
}

interface HubtelBatchStatusResponse {
  batchId?: string;
  data?: {
    rate?: number;
    messageId?: string;
    content?: string;
    status?: string;
    updateTime?: string;
    time?: string;
    to?: string;
    from?: string;
  }[];
}

// ============================================================================
// HUBTEL STATUS CODE DESCRIPTIONS
// Reference: https://developers.hubtel.com/docs/sms-api (Response Codes table)
// ============================================================================

const HUBTEL_STATUS_DESCRIPTIONS: Record<number, string> = {
  0:   "Message submitted successfully.",
  1:   "Invalid destination address — the recipient phone number is not valid.",
  2:   "Invalid source address — check your Sender ID (max 11 characters).",
  3:   "Message body is too long.",
  4:   "Message is not routable on the Hubtel gateway.",
  5:   "Invalid delivery time specified.",
  6:   "Message content was rejected or is invalid.",
  7:   "One or more parameters are not allowed.",
  8:   "One or more parameters are not valid.",
  12:  "Payment required — please fund your Hubtel account to send messages.",
  100: "General invalid request — no data sent or malformed request.",
};

/**
 * Returns a human-readable description for a Hubtel API status code.
 */
export function hubtelStatusDescription(code: number | undefined): string {
  if (code === undefined) return "Unknown error.";
  return HUBTEL_STATUS_DESCRIPTIONS[code] ?? `Hubtel error code ${code}.`;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Normalize a Ghanaian phone number to international format (233XXXXXXXXX).
 * Accepts: 0XXXXXXXXX, +233XXXXXXXXX, 233XXXXXXXXX
 */
export function normalizeGhanaianPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  if (cleaned.startsWith("+233")) return cleaned.substring(1); // strip leading +
  if (cleaned.startsWith("0") && cleaned.length === 10) return `233${cleaned.substring(1)}`;
  if (cleaned.startsWith("233") && cleaned.length === 12) return cleaned;
  return cleaned; // Return as-is if already normalized or unknown format
}

/**
 * Strip HTML to plain text for SMS (Tiptap HTML → plain text).
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Truncate SMS to 160 characters with ellipsis.
 */
export function truncateSMS(text: string, max = 160): string {
  if (text.length <= max) return text;
  return text.substring(0, max - 3) + "...";
}

/**
 * Validate sender ID length (Hubtel enforces max 11 characters).
 */
function validateSenderId(senderId: string): string {
  if (senderId.length > 11) {
    const trimmed = senderId.substring(0, 11);
    console.warn(
      `[Hubtel] Sender ID "${senderId}" exceeds 11 characters — truncated to "${trimmed}".`
    );
    return trimmed;
  }
  return senderId;
}

/**
 * Resolve Hubtel credentials from config or environment variables.
 */
function resolveCredentials(configOrFrom?: string | HubtelConfig): {
  clientId: string | undefined;
  clientSecret: string | undefined;
  senderId: string;
  credentials: string | null; // base64 Basic Auth token, or null if unconfigured
} {
  let clientId = process.env.HUBTEL_CLIENT_ID;
  let clientSecret = process.env.HUBTEL_CLIENT_SECRET;
  let senderId = process.env.HUBTEL_SENDER_ID || "SchoolMS";

  if (configOrFrom && typeof configOrFrom === "object") {
    if (configOrFrom.useCustomSMS) {
      clientId = configOrFrom.hubtelClientId || clientId;
      clientSecret = configOrFrom.hubtelClientSecret || clientSecret;
      senderId = configOrFrom.hubtelSenderId || senderId;
    }
  } else if (typeof configOrFrom === "string") {
    senderId = configOrFrom;
  }

  senderId = validateSenderId(senderId);

  const isConfigured =
    clientId && clientSecret && clientId !== "your_hubtel_client_id";

  const credentials = isConfigured
    ? Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
    : null;

  return { clientId, clientSecret, senderId, credentials };
}

// ============================================================================
// SEND SINGLE SMS — POST /v1/messages/send
// ============================================================================

/**
 * Send a single SMS via Hubtel POST endpoint.
 */
export async function sendSMS(
  to: string,
  message: string,
  configOrFrom?: string | HubtelConfig
): Promise<HubtelSMSResult> {
  const { senderId, credentials } = resolveCredentials(configOrFrom);

  if (!credentials) {
    console.warn("[Hubtel] SMS credentials not configured — skipping SMS delivery.");
    return { success: false, error: "Hubtel SMS is not configured on this server." };
  }

  const normalizedTo = normalizeGhanaianPhone(to);

  try {
    const response = await fetch("https://sms.hubtel.com/v1/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        From: senderId,
        To: normalizedTo,
        Content: message,
      }),
    });

    // Always parse the body — Hubtel may return useful info even on 4xx
    const data: HubtelSingleResponse = await response.json().catch(() => ({}));
    const statusCode = data.status;

    if (response.ok && statusCode === 0) {
      console.log(`✅ [Hubtel] SMS sent to ${normalizedTo}, messageId: ${data.messageId}`);
      return {
        success: true,
        messageId: data.messageId,
        rate: data.rate,
        status: "sent",
      };
    }

    const description = hubtelStatusDescription(statusCode);
    const errorMsg = data.statusDescription || data.message || description;
    console.error(
      `[Hubtel] SMS to ${normalizedTo} failed — HTTP ${response.status}, status code ${statusCode}: ${errorMsg}`
    );
    return {
      success: false,
      error: errorMsg,
      errorCode: statusCode,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Hubtel] Network error sending SMS to ${normalizedTo}:`, error);
    return { success: false, error: `Network error: ${msg}` };
  }
}

// ============================================================================
// BATCH SIMPLE SMS — POST /v1/messages/batch/simple/send
// ============================================================================

/**
 * Send the same message to multiple recipients using Hubtel's batch simple endpoint.
 * More efficient than individual sends for bulk operations.
 */
export async function sendBatchSimpleSMS(
  recipients: string[],
  message: string,
  configOrFrom?: string | HubtelConfig
): Promise<HubtelBatchResult> {
  const { senderId, credentials } = resolveCredentials(configOrFrom);

  if (!credentials) {
    console.warn("[Hubtel] SMS credentials not configured — skipping batch SMS delivery.");
    return {
      success: false,
      error: "Hubtel SMS is not configured on this server.",
      sent: 0,
      failed: recipients.length,
    };
  }

  const normalizedRecipients = recipients.filter(Boolean).map(normalizeGhanaianPhone);

  if (normalizedRecipients.length === 0) {
    return { success: false, error: "No valid recipients provided.", sent: 0, failed: 0 };
  }

  try {
    const response = await fetch(
      "https://sms.hubtel.com/v1/messages/batch/simple/send",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          From: senderId,
          Recipients: normalizedRecipients,
          Content: message,
        }),
      }
    );

    // Always read the response body — Hubtel can return a 400 with a status code
    // like 12 (payment required) that is distinct from an HTTP error.
    const data: HubtelBatchSimpleResponse = await response.json().catch(() => ({}));
    const statusCode = data.status;

    if (statusCode === 0 && data.batchId) {
      const sentCount = data.data?.length ?? normalizedRecipients.length;
      console.log(
        `✅ [Hubtel] Batch SMS sent — batchId: ${data.batchId}, recipients: ${sentCount}`
      );
      return {
        success: true,
        batchId: data.batchId,
        sent: sentCount,
        failed: normalizedRecipients.length - sentCount,
        data: data.data ?? undefined,
      };
    }

    // Map status code to human-readable message
    const description = hubtelStatusDescription(statusCode);
    console.error(
      `[Hubtel] Batch SMS failed — HTTP ${response.status}, status code ${statusCode}: ${description}`
    );
    return {
      success: false,
      error: description,
      errorCode: statusCode,
      sent: 0,
      failed: normalizedRecipients.length,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Hubtel] Network error during batch SMS:", error);
    return {
      success: false,
      error: `Network error: ${msg}`,
      sent: 0,
      failed: normalizedRecipients.length,
    };
  }
}

// ============================================================================
// BATCH PERSONALIZED SMS — POST /v1/messages/batch/personalized/send
// ============================================================================

/**
 * Send personalized messages (each recipient gets a unique message).
 * Uses Hubtel's /v1/messages/batch/personalized/send endpoint.
 */
export async function sendBatchPersonalizedSMS(
  recipients: { phone: string; message: string }[],
  configOrFrom?: string | HubtelConfig
): Promise<HubtelBatchResult> {
  const { senderId, credentials } = resolveCredentials(configOrFrom);

  if (!credentials) {
    console.warn("[Hubtel] SMS credentials not configured — skipping personalized batch SMS.");
    return {
      success: false,
      error: "Hubtel SMS is not configured on this server.",
      sent: 0,
      failed: recipients.length,
    };
  }

  const personalizedRecipients = recipients
    .filter((r) => r.phone)
    .map((r) => ({
      To: normalizeGhanaianPhone(r.phone),
      Content: r.message,
    }));

  if (personalizedRecipients.length === 0) {
    return { success: false, error: "No valid recipients provided.", sent: 0, failed: 0 };
  }

  try {
    const response = await fetch(
      "https://sms.hubtel.com/v1/messages/batch/personalized/send",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          From: senderId,
          personalizedRecipients,
        }),
      }
    );

    const data: HubtelBatchSimpleResponse = await response.json().catch(() => ({}));
    const statusCode = data.status;

    if (statusCode === 0 && data.batchId) {
      const sentCount = data.data?.length ?? personalizedRecipients.length;
      console.log(
        `✅ [Hubtel] Personalized batch SMS sent — batchId: ${data.batchId}, recipients: ${sentCount}`
      );
      return {
        success: true,
        batchId: data.batchId,
        sent: sentCount,
        failed: personalizedRecipients.length - sentCount,
        data: data.data ?? undefined,
      };
    }

    const description = hubtelStatusDescription(statusCode);
    console.error(
      `[Hubtel] Personalized batch SMS failed — HTTP ${response.status}, status code ${statusCode}: ${description}`
    );
    return {
      success: false,
      error: description,
      errorCode: statusCode,
      sent: 0,
      failed: personalizedRecipients.length,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Hubtel] Network error during personalized batch SMS:", error);
    return {
      success: false,
      error: `Network error: ${msg}`,
      sent: 0,
      failed: personalizedRecipients.length,
    };
  }
}

// ============================================================================
// STATUS CHECK — GET /v1/messages/{messageId}
// ============================================================================

/**
 * Check the delivery status of a single message by messageId.
 * Status values: "Delivered", "Sent", "Pending", "Blacklisted",
 *                "Undeliverable", "Failed", "Rejected", etc.
 */
export async function checkMessageStatus(
  messageId: string,
  configOrFrom?: string | HubtelConfig
): Promise<{ success: boolean; data?: HubtelMessageStatusResponse; error?: string }> {
  const { credentials } = resolveCredentials(configOrFrom);

  if (!credentials) {
    return { success: false, error: "Hubtel SMS is not configured on this server." };
  }

  try {
    const response = await fetch(
      `https://sms.hubtel.com/v1/messages/${encodeURIComponent(messageId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${credentials}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const data: HubtelMessageStatusResponse = await response.json();
    return { success: true, data };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: `Network error: ${msg}` };
  }
}

// ============================================================================
// BATCH STATUS CHECK — GET /v1/messages/batch/{batchId}
// ============================================================================

/**
 * Check the delivery status of all messages in a batch by batchId.
 */
export async function checkBatchStatus(
  batchId: string,
  configOrFrom?: string | HubtelConfig
): Promise<{ success: boolean; data?: HubtelBatchStatusResponse; error?: string }> {
  const { credentials } = resolveCredentials(configOrFrom);

  if (!credentials) {
    return { success: false, error: "Hubtel SMS is not configured on this server." };
  }

  try {
    const response = await fetch(
      `https://sms.hubtel.com/v1/messages/batch/${encodeURIComponent(batchId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${credentials}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const data: HubtelBatchStatusResponse = await response.json();
    return { success: true, data };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: `Network error: ${msg}` };
  }
}

// ============================================================================
// BULK SEND HELPER (individual calls, for small volumes)
// ============================================================================

/**
 * Send SMS to multiple recipients individually.
 * For large volumes, prefer sendBatchSimpleSMS or sendBatchPersonalizedSMS instead.
 */
export async function sendBulkSMS(
  recipients: { phone: string; message: string }[],
  configOrFrom?: string | HubtelConfig
): Promise<{ phone: string; result: HubtelSMSResult }[]> {
  const results = await Promise.allSettled(
    recipients.map(({ phone, message }) => sendSMS(phone, message, configOrFrom))
  );

  return recipients.map((r, i) => ({
    phone: r.phone,
    result:
      results[i].status === "fulfilled"
        ? results[i].value
        : { success: false, error: "Promise rejected" },
  }));
}
