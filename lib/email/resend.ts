// /lib/email/resend.ts

import { Resend } from "resend";
import { render } from "@react-email/render";
import { AdminInvitationEmail } from "./templates/admin-invitation";
import { GuardianInvitationEmail } from "./templates/guardian-invitation";
import { PasswordResetEmail } from "./templates/password-reset";
import { StudentCredentialsEmail } from "./templates/student-credentials";
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

interface StudentCredential {
  name: string;
  studentId: string;
  email: string;
  temporaryPassword: string;
}

interface StudentCredentialsEmailParams {
  to: string;
  parentName: string;
  students: StudentCredential[];
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
 * Send student login credentials to parent
 * Supports single or multiple students (siblings)
 */
export async function sendStudentCredentialsEmail(
  params: StudentCredentialsEmailParams,
): Promise<void> {
  const { to, parentName, students, schoolName, loginUrl } = params;

  try {
    const emailHtml = await render(
      StudentCredentialsEmail({
        parentName,
        students,
        schoolName,
        loginUrl,
      }),
    );

    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject:
        students.length === 1
          ? `Student Login Credentials - ${students[0].name}`
          : `Student Login Credentials - ${schoolName}`,
      html: emailHtml,
    });

    console.log(
      `✅ [Email] Student credentials sent to ${to} for ${students.length} student(s)`,
    );
  } catch (error) {
    console.error(
      `❌ [Email] Failed to send student credentials to ${to}:`,
      error,
    );
    throw new Error("Failed to send student credentials email");
  }
}

/**
 * Send subscription expiration alert email
 */
export async function sendSubscriptionAlertEmail(params: {
  to: string;
  schoolName: string;
  daysRemaining: number;
  expiryDate: Date;
  billingUrl: string;
}): Promise<void> {
  const { to, schoolName, daysRemaining, expiryDate, billingUrl } = params;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Action Required: Subscription Expiration in ${daysRemaining} Days`,
      html: `
        <!DOCTYPE html>
        <html>
          <body style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h2 style="color: #d97706;">Subscription Reminder</h2>
              <p>Hello,</p>
              <p>This is a reminder that the subscription for <strong>${schoolName}</strong> is set to expire in <strong>${daysRemaining} days</strong> (on ${expiryDate.toLocaleDateString()}).</p>
              <p>To ensure uninterrupted access to your school management system, please renew your subscription or update your payment details.</p>
              <div style="margin: 30px 0; text-align: center;">
                <a href="${billingUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Renew Subscription</a>
              </div>
              <p>If you have already renewed, please ignore this email.</p>
              <p>Regards,<br>${APP_NAME} Team</p>
            </div>
          </body>
        </html>
      `,
    });

    console.log(`✅ [Email] Subscription alert sent to ${to}`);
  } catch (error) {
    console.error(`❌ [Email] Failed to send subscription alert to ${to}:`, error);
    throw new Error("Failed to send subscription alert email");
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
