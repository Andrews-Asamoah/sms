/**
 * ============================================================================
 * EMAIL SERVICE - RESEND INTEGRATION
 * ============================================================================
 *
 * Email service for sending transactional emails using Resend.
 * Handles invitation emails, password resets, and other notifications.
 *
 * Setup:
 * 1. Install Resend: npm install resend
 * 2. Add RESEND_API_KEY to .env
 * 3. Configure from email in RESEND_FROM_EMAIL
 *
 * ============================================================================
 */

import { Resend } from "resend";

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

interface InvitationEmailParams {
  to: string;
  inviterName: string;
  schoolName: string;
  role: string;
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
// EMAIL TEMPLATES
// ============================================================================

/**
 * Generate HTML for invitation email
 */
function getInvitationEmailHtml(params: InvitationEmailParams): string {
  const { inviterName, schoolName, role, invitationId, expiresAt } = params;
  const inviteUrl = `${APP_URL}/auth/invite/${invitationId}`;
  const expiryDate = expiresAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>You've been invited to ${schoolName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                      🎓 ${APP_NAME}
                    </h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 20px; color: #1a202c; font-size: 24px; font-weight: 600;">
                      You've been invited!
                    </h2>
                    
                    <p style="margin: 0 0 16px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                      <strong>${inviterName}</strong> has invited you to join <strong>${schoolName}</strong> as a <strong>${role}</strong>.
                    </p>
                    
                    <p style="margin: 0 0 32px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                      Click the button below to accept your invitation and create your account:
                    </p>
                    
                    <!-- CTA Button -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 0 0 32px;">
                          <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                            Accept Invitation
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Alternative Link -->
                    <p style="margin: 0 0 16px; color: #718096; font-size: 14px; line-height: 1.6;">
                      Or copy and paste this link into your browser:
                    </p>
                    <p style="margin: 0 0 32px; color: #667eea; font-size: 14px; word-break: break-all;">
                      ${inviteUrl}
                    </p>
                    
                    <!-- Expiry Notice -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff5f5; border-left: 4px solid #f56565; border-radius: 4px;">
                      <tr>
                        <td style="padding: 16px;">
                          <p style="margin: 0; color: #c53030; font-size: 14px;">
                            ⏰ This invitation expires on <strong>${expiryDate}</strong>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 32px; background-color: #f7fafc; border-radius: 0 0 8px 8px; text-align: center;">
                    <p style="margin: 0 0 8px; color: #718096; font-size: 14px;">
                      If you didn't expect this invitation, you can safely ignore this email.
                    </p>
                    <p style="margin: 0; color: #a0aec0; font-size: 12px;">
                      © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

/**
 * Generate HTML for password reset email
 */
function getPasswordResetEmailHtml(params: PasswordResetEmailParams): string {
  const { userName, resetUrl, expiresAt } = params;
  const expiryMinutes = Math.floor(
    (expiresAt.getTime() - Date.now()) / (1000 * 60),
  );

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                      🔐 ${APP_NAME}
                    </h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 20px; color: #1a202c; font-size: 24px; font-weight: 600;">
                      Reset Your Password
                    </h2>
                    
                    <p style="margin: 0 0 16px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                      Hi ${userName},
                    </p>
                    
                    <p style="margin: 0 0 32px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                      We received a request to reset your password. Click the button below to create a new password:
                    </p>
                    
                    <!-- CTA Button -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 0 0 32px;">
                          <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Alternative Link -->
                    <p style="margin: 0 0 16px; color: #718096; font-size: 14px; line-height: 1.6;">
                      Or copy and paste this link into your browser:
                    </p>
                    <p style="margin: 0 0 32px; color: #667eea; font-size: 14px; word-break: break-all;">
                      ${resetUrl}
                    </p>
                    
                    <!-- Security Notice -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fffaf0; border-left: 4px solid #ed8936; border-radius: 4px;">
                      <tr>
                        <td style="padding: 16px;">
                          <p style="margin: 0 0 8px; color: #c05621; font-size: 14px; font-weight: 600;">
                            ⏰ This link expires in ${expiryMinutes} minutes
                          </p>
                          <p style="margin: 0; color: #c05621; font-size: 14px;">
                            For security, this password reset link can only be used once.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 32px; background-color: #f7fafc; border-radius: 0 0 8px 8px; text-align: center;">
                    <p style="margin: 0 0 8px; color: #718096; font-size: 14px;">
                      If you didn't request a password reset, you can safely ignore this email.
                    </p>
                    <p style="margin: 0; color: #a0aec0; font-size: 12px;">
                      © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

// ============================================================================
// EMAIL SENDING FUNCTIONS
// ============================================================================

/**
 * Send invitation email to new member
 */
export async function sendAdminInvitationEmail(
  params: InvitationEmailParams,
): Promise<void> {
  const { to, schoolName } = params;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `You've been invited to join ${schoolName}`,
      html: getInvitationEmailHtml(params),
    });

    console.log(`✅ [Email] Invitation email sent to ${to}`);
  } catch (error) {
    console.error(`❌ [Email] Failed to send invitation to ${to}:`, error);
    throw new Error("Failed to send invitation email");
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
  const { to, userName } = params;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Reset your ${APP_NAME} password`,
      html: getPasswordResetEmailHtml(params),
    });

    console.log(`✅ [Email] Password reset email sent to ${to}`);
  } catch (error) {
    console.error(`❌ [Email] Failed to send password reset to ${to}:`, error);
    throw new Error("Failed to send password reset email");
  }
}

/**
 * Send welcome email to new user
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
