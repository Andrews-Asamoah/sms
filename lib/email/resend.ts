// lib/email/sender.ts - REFACTORED with fixed syntax and better error handling
import { Resend } from "resend";
import { AdminInvitationEmail } from "./templates/admin-invitation";
import { PasswordResetEmail } from "./templates/password-reset";
import { logger } from "@/lib/utils/logger";

// ============================================================================
// CONFIGURATION
// ============================================================================

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is not defined in environment variables");
}

if (!process.env.RESEND_FROM_EMAIL) {
  throw new Error("RESEND_FROM_EMAIL is not defined in environment variables");
}

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = `DrewsTech School System <${process.env.RESEND_FROM_EMAIL}>`;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const EMAIL_TIMEOUT = 30000; // 30 seconds

// ============================================================================
// TYPES
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

export interface EmailResult {
  success: boolean;
  data?: { id: string } | null;
  error?: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a timeout promise that rejects after specified milliseconds
 */
function createTimeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Email sending timeout after ${ms}ms`));
    }, ms);
  });
}

/**
 * Safely send email with timeout and error handling
 */
async function sendEmailWithTimeout<T>(
  emailPromise: Promise<T>,
  timeoutMs: number = EMAIL_TIMEOUT,
): Promise<T> {
  return Promise.race([
    emailPromise,
    createTimeoutPromise(timeoutMs),
  ]) as Promise<T>;
}

// ============================================================================
// INVITATION EMAIL
// ============================================================================

/**
 * Send invitation email to a new user
 * @param params - Invitation email parameters
 * @returns Promise<EmailResult> - Result of email send operation
 */
export async function sendInvitationEmail(
  params: SendInvitationEmailParams,
): Promise<EmailResult> {
  const { to, inviterName, schoolName, role, invitationId, expiresAt } = params;

  const inviteUrl = `${BASE_URL}/auth/invite/${invitationId}`;
  const subject = `${inviterName} invited you to join ${schoolName}`;

  logger.info("Sending invitation email", {
    to,
    invitationId,
    schoolName,
    role,
  });

  const startTime = Date.now();

  try {
    const emailPromise = resend.emails.send({
      from: FROM_EMAIL,
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
        {
          name: "school",
          value: schoolName,
        },
      ],
    });

    const result = (await sendEmailWithTimeout(
      emailPromise,
    )) as ResendEmailResponse;

    const duration = Date.now() - startTime;

    if (result.error) {
      logger.error("Resend API returned error", {
        invitationId,
        error: result.error.message,
        duration,
      });

      return {
        success: false,
        error: result.error.message || "Failed to send invitation email",
      };
    }

    logger.info("Invitation email sent successfully", {
      invitationId,
      emailId: result.data?.id,
      duration,
    });

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    logger.error("Failed to send invitation email", {
      invitationId,
      error: errorMessage,
      duration,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

// ============================================================================
// PASSWORD RESET EMAIL
// ============================================================================

/**
 * Send password reset email to user
 * @param params - Password reset email parameters
 * @returns Promise<EmailResult> - Result of email send operation
 */
export async function sendPasswordResetEmail(
  params: SendPasswordResetEmailParams,
): Promise<EmailResult> {
  const { to, userName, resetUrl, expiresAt } = params;

  const subject = "Reset Your Password - DrewsTech School System";

  logger.info("Sending password reset email", {
    to: to.replace(/(.{3}).*(@.*)/, "$1***$2"), // Mask email for privacy
    userName,
  });

  const startTime = Date.now();

  try {
    const emailPromise = resend.emails.send({
      from: FROM_EMAIL,
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

    const result = (await sendEmailWithTimeout(
      emailPromise,
    )) as ResendEmailResponse;

    const duration = Date.now() - startTime;

    if (result.error) {
      logger.error("Resend API returned error for password reset", {
        error: result.error.message,
        duration,
      });

      // For password reset, we still return success for security
      // (don't reveal if email exists)
      logger.warn("Returning success despite error for security reasons");
      return {
        success: true,
        data: null,
      };
    }

    logger.info("Password reset email sent successfully", {
      emailId: result.data?.id,
      duration,
    });

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    logger.error("Failed to send password reset email", {
      error: errorMessage,
      duration,
    });

    // For security, don't reveal if email exists
    // Return success even on failure
    logger.warn("Returning success despite error for security reasons");
    return {
      success: true,
      data: null,
    };
  }
}

// ============================================================================
// WELCOME EMAIL (Optional - for new users)
// ============================================================================

export interface SendWelcomeEmailParams {
  to: string;
  userName: string;
  schoolName: string;
  role: string;
}

/**
 * Send welcome email to new user after successful registration
 */
export async function sendWelcomeEmail(
  params: SendWelcomeEmailParams,
): Promise<EmailResult> {
  const { to, userName, schoolName, role } = params;

  const subject = `Welcome to ${schoolName}!`;

  logger.info("Sending welcome email", {
    to,
    schoolName,
    role,
  });

  const startTime = Date.now();

  try {
    // You can create a WelcomeEmail template similar to others
    const emailPromise = resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html: `
        <h1>Welcome to ${schoolName}, ${userName}!</h1>
        <p>Your account has been successfully created as a ${role}.</p>
        <p>You can now log in and start using the system.</p>
        <p><a href="${BASE_URL}/auth/sign-in">Sign In Now</a></p>
      `,
      tags: [
        {
          name: "category",
          value: "welcome",
        },
      ],
    });

    const result = (await sendEmailWithTimeout(
      emailPromise,
    )) as ResendEmailResponse;

    const duration = Date.now() - startTime;

    if (result.error) {
      logger.error("Failed to send welcome email", {
        error: result.error.message,
        duration,
      });

      return {
        success: false,
        error: result.error.message,
      };
    }

    logger.info("Welcome email sent successfully", {
      emailId: result.data?.id,
      duration,
    });

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    logger.error("Failed to send welcome email", {
      error: errorMessage,
      duration,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

// ============================================================================
// BULK EMAIL SENDING (For notifications, announcements, etc.)
// ============================================================================

export interface BulkEmailParams {
  recipients: string[];
  subject: string;
  html: string;
  tags?: Array<{ name: string; value: string }>;
}

/**
 * Send email to multiple recipients
 * Note: Resend has rate limits, so batch large lists
 */
export async function sendBulkEmail(
  params: BulkEmailParams,
): Promise<EmailResult[]> {
  const { recipients, subject, html, tags = [] } = params;

  logger.info("Sending bulk email", {
    recipientCount: recipients.length,
    subject,
  });

  const results: EmailResult[] = [];

  // Send in batches to avoid rate limits
  const BATCH_SIZE = 50;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    const batchPromises = batch.map(async (to) => {
      try {
        const result = await resend.emails.send({
          from: FROM_EMAIL,
          to,
          subject,
          html,
          tags: [
            ...tags,
            {
              name: "bulk",
              value: "true",
            },
          ],
        });

        return {
          success: !result.error,
          data: result.data,
          error: result.error?.message,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Add delay between batches to respect rate limits
    if (i + BATCH_SIZE < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  const successCount = results.filter((r) => r.success).length;

  logger.info("Bulk email completed", {
    total: recipients.length,
    successful: successCount,
    failed: recipients.length - successCount,
  });

  return results;
}

// ============================================================================
// EMAIL VERIFICATION (Optional)
// ============================================================================

export interface SendVerificationEmailParams {
  to: string;
  userName: string;
  verificationUrl: string;
}

/**
 * Send email verification link to user
 */
export async function sendVerificationEmail(
  params: SendVerificationEmailParams,
): Promise<EmailResult> {
  const { to, userName, verificationUrl } = params;

  const subject = "Verify Your Email - DrewsTech School System";

  logger.info("Sending verification email", {
    to,
  });

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html: `
        <h1>Verify Your Email, ${userName}</h1>
        <p>Please click the link below to verify your email address:</p>
        <p><a href="${verificationUrl}">Verify Email</a></p>
        <p>This link will expire in 24 hours.</p>
      `,
      tags: [
        {
          name: "category",
          value: "verification",
        },
      ],
    });

    if (result.error) {
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
