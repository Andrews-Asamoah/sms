// /lib/email/resend.ts

import { Resend } from "resend";
import { render } from "@react-email/render";
import prisma from "@/lib/prisma";
import { AdminInvitationEmail } from "./templates/admin-invitation";
import { GuardianInvitationEmail } from "./templates/guardian-invitation";
import { PasswordResetEmail } from "./templates/password-reset";
import { StudentCredentialsEmail } from "./templates/student-credentials";
import { FeeReminderEmail } from "./templates/fee-reminder";
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

// ============================================================================
// FEE REMINDER EMAIL
// ============================================================================

export interface FeeReminderEmailParams {
  to: string;
  guardianName: string;
  studentName: string;
  studentId: string;
  outstandingBalance: number;
  currency: string;
  installmentLabel: string;
  dueDate: Date;
  schoolName: string;
  contentHtml?: string;
  portalUrl: string;
  /** Optional — used to write an EmailLog row for the Sent History page */
  schoolId?: string;
}

/**
 * Send a fee reminder email to a guardian via Resend
 */
export async function sendFeeReminderEmail(
  params: FeeReminderEmailParams
): Promise<{ success: boolean; error?: string }> {
  const {
    to,
    guardianName,
    studentName,
    studentId,
    outstandingBalance,
    currency,
    installmentLabel,
    dueDate,
    schoolName,
    contentHtml,
    portalUrl,
  } = params;

  try {
    const formattedBalance = `${currency} ${outstandingBalance.toFixed(2)}`;
    const formattedDate = dueDate.toLocaleDateString("en-GH", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const emailHtml = await render(
      FeeReminderEmail({
        guardianName,
        studentName,
        studentId,
        outstandingBalance: formattedBalance,
        installmentLabel,
        dueDate: formattedDate,
        schoolName,
        contentHtml,
        portalUrl,
      })
    );

    const feeSubject = `Fee Reminder — ${installmentLabel} | ${studentName} | ${schoolName}`;

    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: feeSubject,
      html: emailHtml,
    });

    console.log(`✅ [Email] Fee reminder sent to ${to} for student ${studentName}`);

    // Log to EmailLog (best-effort)
    if (params.schoolId) {
      await logEmailSent({
        schoolId: params.schoolId,
        recipientEmail: to,
        recipientName: guardianName,
        subject: feeSubject,
        category: "FEE_REMINDER",
        status: "SENT",
      }).catch(() => {});
    }

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`❌ [Email] Fee reminder failed for ${to}:`, error);
    return { success: false, error: msg };
  }
}

// ============================================================================
// ANNOUNCEMENT / FINANCIAL MESSAGE EMAIL
// ============================================================================

/**
 * Send an announcement or financial message email
 */
export async function sendAnnouncementEmail(params: {
  to: string;
  recipientName: string;
  subject: string;
  contentHtml: string;
  schoolName: string;
  schoolSlug: string;
  /** Optional — used to write an EmailLog row for the Sent History page */
  schoolId?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, recipientName, subject, contentHtml, schoolName, schoolSlug } = params;

  try {
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="font-family:'Inter',Arial,sans-serif;background:#f3f4f6;margin:0;padding:0">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
    <div style="background:#1e3a5f;padding:28px 40px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:22px">${schoolName}</h1>
      <p style="color:#93c5fd;margin:4px 0 0;font-size:13px;text-transform:uppercase;letter-spacing:.05em">School Announcement</p>
    </div>
    <div style="padding:32px 40px">
      <p style="color:#374151;font-size:15px;margin:0 0 20px">Dear ${recipientName},</p>
      <h2 style="color:#111827;font-size:18px;margin:0 0 16px">${subject}</h2>
      <div style="color:#374151;font-size:14px;line-height:1.7">${contentHtml}</div>
      <div style="margin:28px 0 0;text-align:center">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/${schoolSlug}/announcements"
           style="background:#1e3a5f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">View on Portal</a>
      </div>
    </div>
    <div style="background:#1e3a5f;padding:16px 40px;text-align:center">
      <p style="color:#93c5fd;font-size:12px;margin:0">© ${new Date().getFullYear()} ${schoolName}</p>
    </div>
  </div>
</body>
</html>`;

    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    console.log(`✅ [Email] Announcement email sent to ${to}`);

    // Log the send to EmailLog (best-effort — don't let logging failures affect the caller)
    if (params.schoolId) {
      await logEmailSent({
        schoolId: params.schoolId,
        recipientEmail: to,
        recipientName,
        subject,
        category: "ANNOUNCEMENT",
        status: "SENT",
      }).catch(() => {});
    }

    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`❌ [Email] Announcement email failed for ${to}:`, error);
    return { success: false, error: msg };
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

/**
 * Send email to a teacher when their gradebook is rejected
 */
export async function sendGradebookRejectedEmail(params: {
  to: string;
  teacherName: string;
  className: string;
  subjectName: string;
  schoolName: string;
  remarks: string;
  gradebookUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  const { to, teacherName, className, subjectName, schoolName, remarks, gradebookUrl } = params;

  try {
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Gradebook Submission Returned</title></head>
<body style="font-family:'Inter',Arial,sans-serif;background:#f3f4f6;margin:0;padding:0">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
    <div style="background:#dc2626;padding:28px 40px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:22px">${schoolName}</h1>
      <p style="color:#fca5a5;margin:4px 0 0;font-size:13px;text-transform:uppercase;letter-spacing:.05em">Gradebook Returned</p>
    </div>
    <div style="padding:32px 40px">
      <p style="color:#374151;font-size:15px;margin:0 0 20px">Dear ${teacherName},</p>
      <h2 style="color:#111827;font-size:18px;margin:0 0 16px">Gradebook for ${className} (${subjectName}) has been returned for correction</h2>
      <p style="color:#374151;font-size:14px;line-height:1.7">The administrator has reviewed your gradebook submission and requested some corrections before approval.</p>
      
      ${remarks ? `
      <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:16px;margin:20px 0;border-radius:0 8px 8px 0">
        <strong style="color:#991b1b;font-size:14px;display:block;margin-bottom:4px">Reviewer Remarks:</strong>
        <p style="color:#7f1d1d;font-size:14px;margin:0;line-height:1.5">${remarks}</p>
      </div>
      ` : ""}
      
      <p style="color:#374151;font-size:14px;line-height:1.7">Please review the remarks, make the necessary corrections, and re-submit the gradebook.</p>
      
      <div style="margin:28px 0 0;text-align:center">
        <a href="${gradebookUrl}"
           style="background:#dc2626;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Open Gradebook</a>
      </div>
    </div>
    <div style="background:#dc2626;padding:16px 40px;text-align:center">
      <p style="color:#fca5a5;font-size:12px;margin:0">© ${new Date().getFullYear()} ${schoolName}</p>
    </div>
  </div>
</body>
</html>`;

    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Gradebook Returned: ${className} - ${subjectName}`,
      html,
    });

    console.log(`✅ [Email] Gradebook rejection email sent to ${to}`);
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`❌ [Email] Gradebook rejection email failed for ${to}:`, error);
    return { success: false, error: msg };
  }
}

// ============================================================================
// EMAIL AUDIT LOG HELPER
// ============================================================================

export type EmailCategory =
  | "ANNOUNCEMENT"
  | "FEE_REMINDER"
  | "INVITATION"
  | "GRADEBOOK"
  | "SYSTEM"
  | "GENERAL";

/**
 * Write a record to the EmailLog table so admins can see a full
 * audit trail of all sent emails in the Communication History page.
 *
 * This is best-effort — wrap calls in .catch(() => {}) so logging
 * failures never block the actual email send.
 */
export async function logEmailSent(params: {
  schoolId: string;
  sentBy?: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  category: EmailCategory;
  status: "SENT" | "FAILED";
  errorMessage?: string;
}): Promise<void> {
  await prisma.emailLog.create({
    data: {
      schoolId: params.schoolId,
      sentBy: params.sentBy ?? null,
      recipientEmail: params.recipientEmail,
      recipientName: params.recipientName ?? null,
      subject: params.subject,
      category: params.category,
      status: params.status,
      errorMessage: params.errorMessage ?? null,
    },
  });
}
