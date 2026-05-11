import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Row,
  Column,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface FeeReminderEmailProps {
  guardianName: string;
  studentName: string;
  studentId: string;
  outstandingBalance: string; // formatted, e.g. "GHS 250.00"
  installmentLabel: string;   // e.g. "1st Installment"
  dueDate: string;            // e.g. "15 May 2025"
  schoolName: string;
  contentHtml?: string;       // Optional rich text from accountant
  portalUrl: string;
}

export const FeeReminderEmail = ({
  guardianName,
  studentName,
  studentId,
  outstandingBalance,
  installmentLabel,
  dueDate,
  schoolName,
  contentHtml,
  portalUrl,
}: FeeReminderEmailProps) => {
  const previewText = `${installmentLabel} fee reminder for ${studentName} — ${outstandingBalance} outstanding`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={headerTitle}>{schoolName}</Heading>
            <Text style={headerSubtitle}>Financial Reminder</Text>
          </Section>

          {/* Main card */}
          <Section style={card}>
            <Text style={greeting}>Dear {guardianName},</Text>

            {/* Student info */}
            <Section style={infoBox}>
              <Row>
                <Column style={infoCell}>
                  <Text style={infoLabel}>Student</Text>
                  <Text style={infoValue}>{studentName}</Text>
                </Column>
                <Column style={infoCell}>
                  <Text style={infoLabel}>Student ID</Text>
                  <Text style={infoValue}>{studentId}</Text>
                </Column>
              </Row>
              <Row>
                <Column style={infoCell}>
                  <Text style={infoLabel}>Installment</Text>
                  <Text style={infoValue}>{installmentLabel}</Text>
                </Column>
                <Column style={infoCell}>
                  <Text style={infoLabel}>Due Date</Text>
                  <Text style={{ ...infoValue, color: "#dc2626" }}>{dueDate}</Text>
                </Column>
              </Row>
            </Section>

            {/* Balance highlight */}
            <Section style={balanceSection}>
              <Text style={balanceLabel}>Outstanding Balance</Text>
              <Text style={balanceAmount}>{outstandingBalance}</Text>
            </Section>

            {/* Custom message from accountant (if any) */}
            {contentHtml && (
              <Section style={customMessageBox}>
                <Text style={customMessageLabel}>Message from {schoolName}:</Text>
                <div
                  dangerouslySetInnerHTML={{ __html: contentHtml }}
                  style={customMessageContent}
                />
              </Section>
            )}

            {/* CTA */}
            <Section style={ctaSection}>
              <Text style={ctaText}>
                Please ensure payment is made before the due date to avoid late fees or other penalties.
              </Text>
              <Button style={ctaButton} href={portalUrl}>
                View Account on Parent Portal
              </Button>
            </Section>

            <Hr style={divider} />

            <Text style={footer}>
              This is an automated reminder from <strong>{schoolName}</strong>.
              If you believe this is an error or have already made payment, please contact the school&apos;s accounts office.
            </Text>
          </Section>

          {/* Footer bar */}
          <Section style={footerBar}>
            <Text style={footerBarText}>
              © {new Date().getFullYear()} {schoolName}. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default FeeReminderEmail;

// ─── Styles ───────────────────────────────────────────────────────────────────

const main: React.CSSProperties = {
  backgroundColor: "#f3f4f6",
  fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
};

const container: React.CSSProperties = {
  margin: "0 auto",
  maxWidth: "600px",
  padding: "0 0 40px",
};

const header: React.CSSProperties = {
  backgroundColor: "#1e3a5f",
  borderRadius: "12px 12px 0 0",
  padding: "32px 40px",
  textAlign: "center",
};

const headerTitle: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "700",
  margin: "0 0 4px",
};

const headerSubtitle: React.CSSProperties = {
  color: "#93c5fd",
  fontSize: "13px",
  margin: 0,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
};

const card: React.CSSProperties = {
  backgroundColor: "#ffffff",
  padding: "32px 40px",
};

const greeting: React.CSSProperties = {
  fontSize: "16px",
  color: "#111827",
  margin: "0 0 24px",
};

const infoBox: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
  padding: "16px",
  marginBottom: "20px",
};

const infoCell: React.CSSProperties = {
  padding: "8px 12px",
};

const infoLabel: React.CSSProperties = {
  fontSize: "11px",
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  margin: "0 0 2px",
};

const infoValue: React.CSSProperties = {
  fontSize: "15px",
  color: "#111827",
  fontWeight: "600",
  margin: 0,
};

const balanceSection: React.CSSProperties = {
  backgroundColor: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "8px",
  padding: "20px",
  textAlign: "center",
  marginBottom: "20px",
};

const balanceLabel: React.CSSProperties = {
  fontSize: "12px",
  color: "#ef4444",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  margin: "0 0 6px",
};

const balanceAmount: React.CSSProperties = {
  fontSize: "32px",
  fontWeight: "800",
  color: "#dc2626",
  margin: 0,
};

const customMessageBox: React.CSSProperties = {
  backgroundColor: "#eff6ff",
  border: "1px solid #bfdbfe",
  borderRadius: "8px",
  padding: "16px 20px",
  marginBottom: "20px",
};

const customMessageLabel: React.CSSProperties = {
  fontSize: "12px",
  color: "#2563eb",
  fontWeight: "600",
  margin: "0 0 8px",
};

const customMessageContent: React.CSSProperties = {
  fontSize: "14px",
  color: "#1e40af",
  lineHeight: "1.6",
};

const ctaSection: React.CSSProperties = {
  textAlign: "center",
  padding: "8px 0 16px",
};

const ctaText: React.CSSProperties = {
  fontSize: "14px",
  color: "#4b5563",
  marginBottom: "16px",
  lineHeight: "1.6",
};

const ctaButton: React.CSSProperties = {
  backgroundColor: "#1e3a5f",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "600",
  padding: "13px 28px",
  textDecoration: "none",
  display: "inline-block",
};

const divider: React.CSSProperties = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

const footer: React.CSSProperties = {
  fontSize: "12px",
  color: "#9ca3af",
  lineHeight: "1.6",
  margin: 0,
};

const footerBar: React.CSSProperties = {
  backgroundColor: "#1e3a5f",
  borderRadius: "0 0 12px 12px",
  padding: "16px 40px",
  textAlign: "center",
};

const footerBarText: React.CSSProperties = {
  color: "#93c5fd",
  fontSize: "12px",
  margin: 0,
};
