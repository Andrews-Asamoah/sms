// lib/email/templates/admin-invitation.tsx
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Preview,
} from "@react-email/components";

interface AdminInvitationEmailProps {
  invitedUserEmail: string;
  inviterName: string;
  schoolName: string;
  role: string;
  inviteUrl: string;
  expiresAt: Date;
}

export const AdminInvitationEmail = ({
  inviterName,
  schoolName,
  role,
  inviteUrl,
  expiresAt,
}: AdminInvitationEmailProps) => {
  const previewText = `${inviterName} invited you to join ${schoolName}`;
  const expiryDate = new Date(expiresAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Html>
      <Head>
        <title>School Invitation</title>
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Text style={heading}>
              You&apos;re Invited to Join {schoolName}
            </Text>

            <Text style={paragraph}>Hi there,</Text>

            <Text style={paragraph}>
              <strong>{inviterName}</strong> has invited you to join{" "}
              <strong>{schoolName}</strong>&apos;s School Management System as a{" "}
              <strong>{role}</strong>.
            </Text>

            <Text style={paragraph}>
              As a {role}, you&apos;ll be able to access the school&apos;s
              management dashboard and collaborate with the team to manage
              school operations effectively.
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={inviteUrl}>
                Accept Invitation
              </Button>
            </Section>

            <Text style={paragraph}>
              Or copy and paste this URL into your browser:
            </Text>
            <Text style={link}>{inviteUrl}</Text>

            <Hr style={hr} />

            <Text style={footer}>
              <strong>Important:</strong> This invitation will expire on{" "}
              <strong>{expiryDate}</strong>.
            </Text>

            <Text style={footer}>
              If you didn&apos;t expect this invitation or if you have any
              questions, please contact {inviterName} at {schoolName}.
            </Text>

            <Hr style={hr} />

            <Text style={footerSmall}>
              This email was sent by DrewsTech Services School Management
              System.
              <br />© {new Date().getFullYear()} DrewsTech Services. All rights
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
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const box = {
  padding: "0 48px",
};

const heading = {
  fontSize: "28px",
  lineHeight: "1.3",
  fontWeight: "700",
  color: "#1f2937",
  margin: "32px 0 24px",
  textAlign: "center" as const,
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "1.6",
  color: "#374151",
  margin: "16px 0",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#2563eb",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 32px",
  lineHeight: "1.4",
};

const link = {
  color: "#2563eb",
  fontSize: "14px",
  textDecoration: "none",
  wordBreak: "break-all" as const,
  backgroundColor: "#f3f4f6",
  padding: "12px",
  borderRadius: "6px",
  display: "block",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

const footer = {
  color: "#4b5563",
  fontSize: "14px",
  lineHeight: "1.6",
  margin: "12px 0",
};

const footerSmall = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "1.5",
  margin: "8px 0",
  textAlign: "center" as const,
};
