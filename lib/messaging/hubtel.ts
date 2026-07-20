/**
 * Hubtel SMS Gateway service
 * Documentation: https://developers.hubtel.com/docs/sending-a-message
 * Uses HTTP Basic Auth: clientId:clientSecret
 */

export interface HubtelConfig {
  useCustomSMS?: boolean;
  hubtelClientId?: string | null;
  hubtelClientSecret?: string | null;
  hubtelSenderId?: string | null;
}

interface HubtelSMSResult {
  success: boolean;
  messageId?: string;
  rate?: number;
  status?: string;
  error?: string;
}

export interface HubtelBatchResult {
  success: boolean;
  batchId?: string;
  sent: number;
  failed: number;
  error?: string;
  data?: { recipient: string; messageId: string; content: string }[];
}

interface HubtelSMSResponse {
  status?: number;
  Status?: number;
  messageId?: string;
  MessageId?: string;
  rate?: number;
  Rate?: number;
  networkId?: string;
  NetworkId?: string;
  statusDescription?: string | null;
  message?: string;
  Message?: string;
}

interface HubtelBatchSimpleResponse {
  batchId?: string;
  status?: number;
  data?: {
    recipient: string;
    content: string;
    messageId: string;
  }[];
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

/**
 * Normalize a Ghanaian phone number to international format (233XXXXXXXXX)
 * Accepts: 0XXXXXXXXX, +233XXXXXXXXX, 233XXXXXXXXX
 */
export function normalizeGhanaianPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  if (cleaned.startsWith("+233")) return cleaned.substring(1); // strip +
  if (cleaned.startsWith("0") && cleaned.length === 10) return `233${cleaned.substring(1)}`;
  if (cleaned.startsWith("233") && cleaned.length === 12) return cleaned;
  return cleaned; // Return as-is if already normalized or unknown format
}

/**
 * Strip HTML to plain text for SMS (Tiptap HTML → plain text)
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
 * Truncate SMS to 160 characters with ellipsis
 */
export function truncateSMS(text: string, max = 160): string {
  if (text.length <= max) return text;
  return text.substring(0, max - 3) + "...";
}

/**
 * Resolve Hubtel credentials from config or environment
 */
function resolveCredentials(configOrFrom?: string | HubtelConfig): {
  clientId: string | undefined;
  clientSecret: string | undefined;
  senderId: string;
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

  return { clientId, clientSecret, senderId };
}

/**
 * Send a single SMS via Hubtel POST endpoint
 */
export async function sendSMS(
  to: string,
  message: string,
  configOrFrom?: string | HubtelConfig
): Promise<HubtelSMSResult> {
  const { clientId, clientSecret, senderId } = resolveCredentials(configOrFrom);

  if (!clientId || !clientSecret || clientId === "your_hubtel_client_id") {
    console.warn("[Hubtel] SMS credentials not configured — skipping SMS delivery.");
    return { success: false, error: "Hubtel not configured" };
  }

  const normalizedTo = normalizeGhanaianPhone(to);
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

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

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Hubtel] SMS failed to ${normalizedTo}: ${response.status} ${errorText}`);
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const data: HubtelSMSResponse = await response.json();
    const status = typeof data.status === "number" ? data.status : data.Status;
    const messageId = data.messageId || data.MessageId;
    const rate = typeof data.rate === "number" ? data.rate : data.Rate;
    const errorMessage = data.statusDescription || data.message || data.Message;

    if (status === 0) {
      console.log(`✅ [Hubtel] SMS sent to ${normalizedTo}, messageId: ${messageId}`);
      return {
        success: true,
        messageId: messageId,
        rate: rate,
        status: "sent",
      };
    } else {
      console.error(`[Hubtel] SMS rejected for ${normalizedTo}: ${JSON.stringify(data)}`);
      return { success: false, error: errorMessage || `Status ${status}` };
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Hubtel] Network error sending to ${normalizedTo}:`, error);
    return { success: false, error: msg };
  }
}

/**
 * Send a batch simple SMS to multiple recipients (same message for all)
 * Uses Hubtel's /v1/messages/batch/simple/send endpoint for efficiency
 */
export async function sendBatchSimpleSMS(
  recipients: string[],
  message: string,
  configOrFrom?: string | HubtelConfig
): Promise<HubtelBatchResult> {
  const { clientId, clientSecret, senderId } = resolveCredentials(configOrFrom);

  if (!clientId || !clientSecret || clientId === "your_hubtel_client_id") {
    console.warn("[Hubtel] SMS credentials not configured — skipping batch SMS delivery.");
    return { success: false, error: "Hubtel not configured", sent: 0, failed: recipients.length };
  }

  const normalizedRecipients = recipients
    .filter(Boolean)
    .map(normalizeGhanaianPhone);

  if (normalizedRecipients.length === 0) {
    return { success: false, error: "No valid recipients", sent: 0, failed: 0 };
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  try {
    const response = await fetch("https://sms.hubtel.com/v1/messages/batch/simple/send", {
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
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Hubtel] Batch SMS failed: ${response.status} ${errorText}`);
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
        sent: 0,
        failed: normalizedRecipients.length,
      };
    }

    const data: HubtelBatchSimpleResponse = await response.json();

    if (data.status === 0 && data.batchId) {
      const sentCount = data.data?.length ?? normalizedRecipients.length;
      console.log(`✅ [Hubtel] Batch SMS sent: batchId=${data.batchId}, recipients=${sentCount}`);
      return {
        success: true,
        batchId: data.batchId,
        sent: sentCount,
        failed: normalizedRecipients.length - sentCount,
        data: data.data,
      };
    } else {
      console.error(`[Hubtel] Batch SMS rejected: ${JSON.stringify(data)}`);
      return {
        success: false,
        error: `Batch rejected (status ${data.status})`,
        sent: 0,
        failed: normalizedRecipients.length,
      };
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Hubtel] Network error during batch SMS:", error);
    return { success: false, error: msg, sent: 0, failed: normalizedRecipients.length };
  }
}

/**
 * Send personalized batch SMS (each recipient gets a unique message)
 * Uses Hubtel's /v1/messages/batch/personalized/send endpoint
 */
export async function sendBatchPersonalizedSMS(
  recipients: { phone: string; message: string }[],
  configOrFrom?: string | HubtelConfig
): Promise<HubtelBatchResult> {
  const { clientId, clientSecret, senderId } = resolveCredentials(configOrFrom);

  if (!clientId || !clientSecret || clientId === "your_hubtel_client_id") {
    console.warn("[Hubtel] SMS credentials not configured — skipping personalized batch SMS.");
    return { success: false, error: "Hubtel not configured", sent: 0, failed: recipients.length };
  }

  const personalizedRecipients = recipients
    .filter((r) => r.phone)
    .map((r) => ({
      To: normalizeGhanaianPhone(r.phone),
      Content: r.message,
    }));

  if (personalizedRecipients.length === 0) {
    return { success: false, error: "No valid recipients", sent: 0, failed: 0 };
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  try {
    const response = await fetch("https://sms.hubtel.com/v1/messages/batch/personalized/send", {
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
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Hubtel] Personalized batch SMS failed: ${response.status} ${errorText}`);
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
        sent: 0,
        failed: personalizedRecipients.length,
      };
    }

    const data: HubtelBatchSimpleResponse = await response.json();

    if (data.status === 0 && data.batchId) {
      const sentCount = data.data?.length ?? personalizedRecipients.length;
      console.log(`✅ [Hubtel] Personalized batch sent: batchId=${data.batchId}, recipients=${sentCount}`);
      return {
        success: true,
        batchId: data.batchId,
        sent: sentCount,
        failed: personalizedRecipients.length - sentCount,
        data: data.data,
      };
    } else {
      console.error(`[Hubtel] Personalized batch rejected: ${JSON.stringify(data)}`);
      return {
        success: false,
        error: `Batch rejected (status ${data.status})`,
        sent: 0,
        failed: personalizedRecipients.length,
      };
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Hubtel] Network error during personalized batch SMS:", error);
    return { success: false, error: msg, sent: 0, failed: personalizedRecipients.length };
  }
}

/**
 * Check the delivery status of a single message by messageId
 */
export async function checkMessageStatus(
  messageId: string,
  configOrFrom?: string | HubtelConfig
): Promise<{ success: boolean; data?: HubtelMessageStatusResponse; error?: string }> {
  const { clientId, clientSecret } = resolveCredentials(configOrFrom);

  if (!clientId || !clientSecret || clientId === "your_hubtel_client_id") {
    return { success: false, error: "Hubtel not configured" };
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  try {
    const response = await fetch(`https://sms.hubtel.com/v1/messages/${messageId}`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const data: HubtelMessageStatusResponse = await response.json();
    return { success: true, data };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: msg };
  }
}

/**
 * Send bulk SMS to multiple recipients (individual calls — use sendBatchSimpleSMS for better performance)
 * Returns per-recipient results
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
