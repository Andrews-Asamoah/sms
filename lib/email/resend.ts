// /lib/email/resend.ts

import { Resend } from "resend";
import { render } from "@react-email/render";
import { AdminInvitationEmail } from "./templates/admin-invitation";
import { GuardianInvitationEmail } from "./templates/guardian-invitation";
import { PasswordResetEmail } from "./templates/password-reset";

// ============================================================================
// CONFIGURATION
// ============================================================================

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@yourdomain.com";
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "SchoolMS";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface AdminInvitationEmailParams {
  to: string;
  inviterName: string;
  schoolName: string;
  role: string;
  invitationId: string;
  expiresAt: Date;
}

interface GuardianInvitationEmailParams {
  to: string;
  guardianName: string;
  studentName: string;
  schoolName: string;
  invitationId: string;
  expiresAt: Date;
}

interface PasswordResetEmailParams {
  to: string;
  userName: string;
  resetUrl: string;
  expiresAt: Date;
}

interface WelcomeEmailParams {
  to: string;
  userName: string;
  schoolName: string;
  loginUrl: string;
}

// ============================================================================
// EMAIL SENDING FUNCTIONS
// ============================================================================

/**
 * Send invitation email to new admin/staff member
 */
export async function sendAdminInvitationEmail(
  params: AdminInvitationEmailParams,
): Promise<void> {
  const { to, schoolName, inviterName, role, invitationId, expiresAt } = params;
  const inviteUrl = `${APP_URL}/auth/invite/${invitationId}`;

  try {
    const emailHtml = await render(
      AdminInvitationEmail({
        invitedUserEmail: to,
        inviterName,
        schoolName,
        role,
        inviteUrl,
        expiresAt,
      }),
    );

    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `You've been invited to join ${schoolName}`,
      html: emailHtml,
    });

    console.log(`✅ [Email] Admin invitation email sent to ${to}`);
  } catch (error) {
    console.error(
      `❌ [Email] Failed to send admin invitation to ${to}:`,
      error,
    );
    throw new Error("Failed to send invitation email");
  }
}

/**
 * Send invitation email to guardian/parent
 */
export async function sendGuardianInvitationEmail(
  params: GuardianInvitationEmailParams,
): Promise<void> {
  const { to, guardianName, studentName, schoolName, invitationId, expiresAt } =
    params;
  const inviteUrl = `${APP_URL}/auth/invite/${invitationId}`;

  try {
    // Render React Email component to HTML (await because render returns Promise<string>)
    const emailHtml = await render(
      GuardianInvitationEmail({
        guardianName,
        studentName,
        schoolName,
        inviteUrl,
        expiresAt,
      }),
    );

    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Parent Portal Invitation - ${schoolName}`,
      html: emailHtml,
    });

    console.log(`✅ [Email] Guardian invitation email sent to ${to}`);
  } catch (error) {
    console.error(
      `❌ [Email] Failed to send guardian invitation to ${to}:`,
      error,
    );
    throw new Error("Failed to send guardian invitation email");
  }
}

/**
 * Alias for backwards compatibility
 */
export const sendInvitationEmail = sendAdminInvitationEmail;

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  params: PasswordResetEmailParams,
): Promise<void> {
  const { to, userName, resetUrl, expiresAt } = params;

  try {
    const emailHtml = await render(
      PasswordResetEmail({
        userName,
        resetUrl,
        expiresAt,
      }),
    );

    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Reset your ${APP_NAME} password`,
      html: emailHtml,
    });

    console.log(`✅ [Email] Password reset email sent to ${to}`);
  } catch (error) {
    console.error(`❌ [Email] Failed to send password reset to ${to}:`, error);
    throw new Error("Failed to send password reset email");
  }
}

/**
 * Send welcome email to new user
 * TODO: Create WelcomeEmail React component for consistency
 */
export async function sendWelcomeEmail(
  params: WelcomeEmailParams,
): Promise<void> {
  const { to, userName, schoolName, loginUrl } = params;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Welcome to ${schoolName}!`,
      html: `
        <!DOCTYPE html>
        <html>
          <body>
            <h1>Welcome ${userName}!</h1>
            <p>Your account has been created for ${schoolName}.</p>
            <p><a href="${loginUrl}">Login to your account</a></p>
          </body>
        </html>
      `,
    });

    console.log(`✅ [Email] Welcome email sent to ${to}`);
  } catch (error) {
    console.error(`❌ [Email] Failed to send welcome email to ${to}:`, error);
    throw new Error("Failed to send welcome email");
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate email configuration
 */
export function validateEmailConfig(): boolean {
  if (!process.env.RESEND_API_KEY) {
    console.error("❌ [Email] RESEND_API_KEY not configured");
    return false;
  }

  if (!process.env.RESEND_FROM_EMAIL) {
    console.warn("⚠️ [Email] RESEND_FROM_EMAIL not configured, using default");
  }

  return true;
}

/**
 * Test email sending
 */
export async function sendTestEmail(to: string): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Test Email from SchoolMS",
      html: "<h1>Test Email</h1><p>Email configuration is working!</p>",
    });

    console.log(`✅ [Email] Test email sent to ${to}`);
  } catch (error) {
    console.error(`❌ [Email] Test email failed:`, error);
    throw error;
  }
}
