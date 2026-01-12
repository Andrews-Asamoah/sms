// lib/email/resend.ts
import { Resend } from "resend";
import { AdminInvitationEmail } from "./templates/admin-invitation";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is not defined");
}

if (!process.env.RESEND_FROM_EMAIL) {
  throw new Error("RESEND_FROM_EMAIL is not defined");
}

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendInvitationEmailParams {
  to: string;
  inviterName: string;
  schoolName: string;
  role: string;
  invitationId: string;
  expiresAt: Date;
}

// Helper function to create a timeout promise
function timeoutPromise(ms: number) {
  return new Promise((_, reject) => {
    setTimeout(
      () => reject(new Error(`Email sending timeout after ${ms}ms`)),
      ms
    );
  });
}

export async function sendAdminInvitationEmail({
  to,
  inviterName,
  schoolName,
  role,
  invitationId,
  expiresAt,
}: SendInvitationEmailParams) {
  console.log("📧 [Resend] ===== EMAIL SEND START =====");
  console.log(`📧 [Resend] Timestamp: ${new Date().toISOString()}`);
  console.log(`📧 [Resend] To: ${to}`);
  console.log(`📧 [Resend] School: ${schoolName}`);
  console.log(`📧 [Resend] Role: ${role}`);
  console.log(`📧 [Resend] Invitation ID: ${invitationId}`);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteUrl = `${baseUrl}/invite/${invitationId}`;

  console.log(`📧 [Resend] Invite URL: ${inviteUrl}`);
  console.log(
    `📧 [Resend] From: DrewsTech Services <${process.env.RESEND_FROM_EMAIL}>`
  );
  console.log(
    `📧 [Resend] API Key: ${process.env.RESEND_API_KEY?.substring(0, 10)}...`
  );

  try {
    const startTime = Date.now();
    console.log(`📧 [Resend] Calling Resend API...`);

    // Send email with proper headers to avoid spam
    const emailPromise = resend.emails.send({
      from: `DrewsTech School System <${process.env.RESEND_FROM_EMAIL}>`,
      to,
      subject: `${inviterName} invited you to join ${schoolName}`,
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
    const result = await Promise.race([
      emailPromise,
      timeoutPromise(30000), // 30 second timeout
    ]);

    // Handle result - check if it's an error or valid response
    const response = result as {
      data?: { id: string } | null;
      error?: Error | null;
    };
    const { data, error } = response;

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`📧 [Resend] API call completed in ${duration}ms`);

    if (error) {
      console.error("❌ [Resend] Error response from Resend:", error);
      console.error("❌ [Resend] Error type:", typeof error);
      console.error(
        "❌ [Resend] Error details:",
        JSON.stringify(error, null, 2)
      );
      throw new Error(error.message || "Failed to send email");
    }

    console.log(`✅ [Resend] Email sent successfully!`);
    console.log(`✅ [Resend] Duration: ${duration}ms`);
    console.log(`✅ [Resend] Email ID: ${data?.id || "N/A"}`);
    console.log(`✅ [Resend] Response:`, JSON.stringify(data, null, 2));
    console.log("📧 [Resend] ===== EMAIL SEND END =====");

    return { success: true, data };
  } catch (error) {
    console.error("❌ [Resend] ===== EMAIL SEND FAILED =====");
    console.error("❌ [Resend] Error caught:", error);

    if (error instanceof Error) {
      console.error("❌ [Resend] Error name:", error.name);
      console.error("❌ [Resend] Error message:", error.message);
      console.error("❌ [Resend] Error stack:", error.stack);
    }

    console.error("❌ [Resend] ===== EMAIL SEND END =====");
    throw error;
  }
}
