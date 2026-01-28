// lib/email/resend.ts
import { Resend } from "resend";
import { AdminInvitationEmail } from "./templates/admin-invitation";
import { PasswordResetEmail } from "./templates/password-reset";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is not defined");
}
if (!process.env.RESEND_FROM_EMAIL) {
  throw new Error("RESEND_FROM_EMAIL is not defined");
}

const resend = new Resend(process.env.RESEND_API_KEY);

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface SendInvitationEmailParams {
  to: string;
  inviterName: string;
  schoolName: string;
  role: string;
  invitationId: string;
  expiresAt: Date;
}

export interface SendPasswordResetEmailParams {
  to: string;
  userName: string;
  resetUrl: string;
  expiresAt: Date;
}

interface ResendEmailResponse {
  data?: { id: string } | null;
  error?: Error | null;
}

interface EmailResult {
  success: boolean;
  data?: { id: string } | null;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Helper function to create a timeout promise
 */
function timeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(
      () => reject(new Error(`Email sending timeout after ${ms}ms`)),
      ms,
    );
  });
}

/**
 * Helper to safely log email sending attempts
 */
function logEmailStart(params: {
  to: string;
  subject: string;
  id?: string;
}): void {
  console.log("📧 [Resend] ===== EMAIL SEND START =====");
  console.log(`📧 [Resend] Timestamp: ${new Date().toISOString()}`);
  console.log(`📧 [Resend] To: ${params.to}`);
  console.log(`📧 [Resend] Subject: ${params.subject}`);
  if (params.id) {
    console.log(`📧 [Resend] ID: ${params.id}`);
  }
  console.log(
    `📧 [Resend] From: DrewsTech Services <${process.env.RESEND_FROM_EMAIL}>`,
  );
  console.log(
    `📧 [Resend] API Key: ${process.env.RESEND_API_KEY?.substring(0, 10)}...`,
  );
}

/**
 * Helper to log successful email send
 */
function logEmailSuccess(duration: number, emailId?: string): void {
  console.log(`✅ [Resend] Email sent successfully!`);
  console.log(`✅ [Resend] Duration: ${duration}ms`);
  console.log(`✅ [Resend] Email ID: ${emailId || "N/A"}`);
  console.log("📧 [Resend] ===== EMAIL SEND END =====");
}

/**
 * Helper to log email send failure
 */
function logEmailError(error: unknown): void {
  console.error("❌ [Resend] ===== EMAIL SEND FAILED =====");
  console.error("❌ [Resend] Error caught:", error);
  if (error instanceof Error) {
    console.error("❌ [Resend] Error name:", error.name);
    console.error("❌ [Resend] Error message:", error.message);
    console.error("❌ [Resend] Error stack:", error.stack);
  }
  console.error("❌ [Resend] ===== EMAIL SEND END =====");
}

// ============================================================================
// ADMIN INVITATION EMAIL
// ============================================================================

export async function sendAdminInvitationEmail({
  to,
  inviterName,
  schoolName,
  role,
  invitationId,
  expiresAt,
}: SendInvitationEmailParams): Promise<EmailResult> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteUrl = `${baseUrl}/auth/invite/${invitationId}`;
  const subject = `${inviterName} invited you to join ${schoolName}`;

  logEmailStart({
    to,
    subject,
    id: invitationId,
  });

  console.log(`📧 [Resend] School: ${schoolName}`);
  console.log(`📧 [Resend] Role: ${role}`);
  console.log(`📧 [Resend] Invite URL: ${inviteUrl}`);

  try {
    const startTime = Date.now();
    console.log(`📧 [Resend] Calling Resend API...`);

    // Send email with proper headers to avoid spam
    const emailPromise = resend.emails.send({
      from: `DrewsTech School System <${process.env.RESEND_FROM_EMAIL}>`,
      to,
      subject,
      react: AdminInvitationEmail({
        invitedUserEmail: to,
        inviterName,
        schoolName,
        role,
        inviteUrl,
        expiresAt,
      }),
      headers: {
        "X-Entity-Ref-ID": invitationId,
      },
      tags: [
        {
          name: "category",
          value: "invitation",
        },
      ],
    });

    // Race between email send and timeout
    const result = (await Promise.race([
      emailPromise,
      timeoutPromise(30000), // 30 second timeout
    ])) as ResendEmailResponse;

    const { data, error } = result;
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`📧 [Resend] API call completed in ${duration}ms`);

    if (error) {
      console.error("❌ [Resend] Error response from Resend:", error);
      console.error("❌ [Resend] Error type:", typeof error);
      console.error(
        "❌ [Resend] Error details:",
        JSON.stringify(error, null, 2),
      );
      throw new Error(error.message || "Failed to send email");
    }

    logEmailSuccess(duration, data?.id);

    return { success: true, data };
  } catch (error) {
    logEmailError(error);
    throw error;
  }
}

// ============================================================================
// PASSWORD RESET EMAIL
// ============================================================================

export async function sendPasswordResetEmail({
  to,
  userName,
  resetUrl,
  expiresAt,
}: SendPasswordResetEmailParams): Promise<EmailResult> {
  const subject = "Reset Your Password - DrewsTech School System";

  logEmailStart({ to, subject });

  console.log(`📧 [Resend] User: ${userName}`);
  console.log(`📧 [Resend] Reset URL: ${resetUrl}`);
  console.log(`📧 [Resend] Expires: ${expiresAt.toISOString()}`);

  try {
    const startTime = Date.now();
    console.log(`📧 [Resend] Calling Resend API...`);

    // Send email with proper headers to avoid spam
    const emailPromise = resend.emails.send({
      from: `DrewsTech School System <${process.env.RESEND_FROM_EMAIL}>`,
      to,
      subject,
      react: PasswordResetEmail({
        userName,
        resetUrl,
        expiresAt,
      }),
      headers: {
        "X-Priority": "1",
        Importance: "high",
      },
      tags: [
        {
          name: "category",
          value: "password-reset",
        },
      ],
    });

    // Race between email send and timeout
    const result = (await Promise.race([
      emailPromise,
      timeoutPromise(30000), // 30 second timeout
    ])) as ResendEmailResponse;

    const { data, error } = result;
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`📧 [Resend] API call completed in ${duration}ms`);

    if (error) {
      console.error("❌ [Resend] Error response from Resend:", error);
      console.error("❌ [Resend] Error type:", typeof error);
      console.error(
        "❌ [Resend] Error details:",
        JSON.stringify(error, null, 2),
      );
      throw new Error(error.message || "Failed to send password reset email");
    }

    logEmailSuccess(duration, data?.id);

    return { success: true, data };
  } catch (error) {
    logEmailError(error);
    // Don't throw the error - we don't want to reveal if the email exists
    // Just log it and return success
    console.warn(
      "⚠️ [Resend] Failed to send password reset email, but returning success for security",
    );
    return { success: true, data: null };
  }
}
