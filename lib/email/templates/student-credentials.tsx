// lib/email/templates/student-credentials.tsx
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

interface StudentCredentialsEmailProps {
  parentName: string;
  students: Array<{
    name: string;
    studentId: string;
    email: string;
    temporaryPassword: string;
  }>;
  schoolName: string;
  loginUrl: string;
}

export const StudentCredentialsEmail = ({
  parentName,
  students,
  schoolName,
  loginUrl,
}: StudentCredentialsEmailProps) => {
  const previewText =
    students.length === 1
      ? `Login credentials for ${students[0].name}`
      : `Login credentials for ${students.length} students`;

  return (
    <Html>
      <Head>
        <title>Student Login Credentials</title>
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Text style={heading}>Student Login Credentials</Text>
            <Text style={schoolNameText}>{schoolName}</Text>

            <Text style={paragraph}>Dear {parentName},</Text>

            <Text style={paragraph}>
              {students.length === 1
                ? "A student account has been created for your child."
                : `Student accounts have been created for your ${students.length} children.`}
            </Text>

            {students.map((student, index) => (
              <Section key={index} style={credentialsBox}>
                <Text style={studentName}>{student.name}</Text>
                <Text style={studentId}>ID: {student.studentId}</Text>

                <Section style={credentialRow}>
                  <Text style={credentialLabel}>Email:</Text>
                  <Text style={credentialValue}>{student.email}</Text>
                </Section>

                <Section style={credentialRow}>
                  <Text style={credentialLabel}>Temporary Password:</Text>
                  <Text style={credentialValue}>
                    {student.temporaryPassword}
                  </Text>
                </Section>
              </Section>
            ))}

            <Section style={warningBox}>
              <Text style={warningTitle}>
                ⚠️ Important Security Instructions
              </Text>
              <Text style={warningItem}>
                • These are temporary passwords that{" "}
                <strong>must be changed</strong> on first login
              </Text>
              <Text style={warningItem}>
                • Do not share these credentials with anyone
              </Text>
              <Text style={warningItem}>
                • Please help your child(ren) change their password(s) upon
                first login
              </Text>
              <Text style={warningItem}>• Choose strong, unique passwords</Text>
              <Text style={warningItem}>
                • Keep these credentials in a safe place
              </Text>
            </Section>

            <Section style={buttonContainer}>
              <Button style={button} href={loginUrl}>
                Login to Student Portal
              </Button>
            </Section>

            <Text style={paragraph}>
              Or copy and paste this URL into your browser:
            </Text>
            <Text style={link}>{loginUrl}</Text>

            <Hr style={hr} />

            <Text style={footer}>
              If you have any questions or need assistance, please contact the
              school administration.
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
  margin: "32px 0 8px",
  textAlign: "center" as const,
};

const schoolNameText = {
  fontSize: "16px",
  color: "#6b7280",
  textAlign: "center" as const,
  margin: "0 0 24px",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "1.6",
  color: "#374151",
  margin: "16px 0",
};

const credentialsBox = {
  backgroundColor: "#f9fafb",
  border: "2px solid #e5e7eb",
  borderLeft: "4px solid #2563eb",
  borderRadius: "8px",
  padding: "20px",
  margin: "20px 0",
};

const studentName = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#1f2937",
  margin: "0 0 4px",
};

const studentId = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "0 0 16px",
};

const credentialRow = {
  margin: "12px 0",
};

const credentialLabel = {
  fontSize: "13px",
  fontWeight: "600",
  color: "#4b5563",
  margin: "0 0 4px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
};

const credentialValue = {
  fontSize: "15px",
  fontFamily: "'Courier New', monospace",
  backgroundColor: "#ffffff",
  padding: "10px 12px",
  borderRadius: "4px",
  border: "1px solid #d1d5db",
  margin: "0",
  display: "block",
  wordBreak: "break-all" as const,
};

const warningBox = {
  backgroundColor: "#fef3c7",
  borderLeft: "4px solid #f59e0b",
  padding: "20px",
  margin: "24px 0",
  borderRadius: "4px",
};

const warningTitle = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#92400e",
  margin: "0 0 12px",
};

const warningItem = {
  fontSize: "14px",
  lineHeight: "1.6",
  color: "#92400e",
  margin: "8px 0",
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
  margin: "8px 0",
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

export default StudentCredentialsEmail;
