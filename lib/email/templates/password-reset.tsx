// lib/email/templates/password-reset.tsx
import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface PasswordResetEmailProps {
  userName: string;
  resetUrl: string;
  expiresAt: Date;
}

export const PasswordResetEmail = ({
  userName,
  resetUrl,
  expiresAt,
}: PasswordResetEmailProps) => {
  const formattedExpiry = expiresAt.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <Html>
      <Head />
      <Preview>Reset your password for DrewsTech School System</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={headerTitle}>🔐 Reset Your Password</Heading>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Text style={greeting}>Hi {userName},</Text>

            <Text style={paragraph}>
              We received a request to reset your password for your DrewsTech
              School System account. Click the button below to create a new
              password:
            </Text>

            {/* Button */}
            <Section style={buttonContainer}>
              <Button style={button} href={resetUrl}>
                Reset Password
              </Button>
            </Section>

            <Text style={smallText}>Or copy and paste this link:</Text>

            <Section style={codeBox}>
              <Text style={codeText}>{resetUrl}</Text>
            </Section>

            {/* Warning Box */}
            <Section style={warningBox}>
              <Text style={warningText}>
                ⚠️ <strong>Important:</strong> This link will expire on{" "}
                {formattedExpiry}.
              </Text>
            </Section>

            <Text style={paragraph}>
              If you didn&apos;t request a password reset, you can safely ignore
              this email. Your password will not be changed.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              For security reasons, please do not share this email with anyone.
            </Text>
            <Text style={footerCopyright}>
              © {new Date().getFullYear()} DrewsTech School System. All rights
              reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Styles
const main = {
  backgroundColor: "#f3f4f6",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
};

const container = {
  margin: "40px auto",
  padding: "0",
  maxWidth: "600px",
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
  overflow: "hidden",
};

const header = {
  padding: "40px 40px 20px 40px",
  textAlign: "center" as const,
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
};

const headerTitle = {
  margin: "0",
  color: "#ffffff",
  fontSize: "28px",
  fontWeight: "700",
  lineHeight: "1.2",
};

const content = {
  padding: "40px",
};

const greeting = {
  margin: "0 0 20px 0",
  color: "#374151",
  fontSize: "16px",
  lineHeight: "1.6",
};

const paragraph = {
  margin: "0 0 20px 0",
  color: "#374151",
  fontSize: "16px",
  lineHeight: "1.6",
};

const buttonContainer = {
  margin: "30px 0",
  textAlign: "center" as const,
};

const button = {
  display: "inline-block",
  padding: "16px 32px",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  color: "#ffffff",
  textDecoration: "none",
  borderRadius: "6px",
  fontWeight: "600",
  fontSize: "16px",
};

const smallText = {
  margin: "20px 0",
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: "1.6",
};

const codeBox = {
  margin: "0 0 20px 0",
  padding: "12px",
  backgroundColor: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "4px",
};

const codeText = {
  margin: "0",
  color: "#374151",
  fontSize: "14px",
  wordBreak: "break-all" as const,
};

const warningBox = {
  margin: "30px 0",
  padding: "16px",
  backgroundColor: "#fef3c7",
  borderLeft: "4px solid #f59e0b",
  borderRadius: "4px",
};

const warningText = {
  margin: "0",
  color: "#92400e",
  fontSize: "14px",
  lineHeight: "1.6",
};

const footer = {
  padding: "30px 40px",
  backgroundColor: "#f9fafb",
  borderTop: "1px solid #e5e7eb",
};

const footerText = {
  margin: "0 0 10px 0",
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "1.6",
};

const footerCopyright = {
  margin: "0",
  color: "#9ca3af",
  fontSize: "12px",
  lineHeight: "1.6",
};

export default PasswordResetEmail;
