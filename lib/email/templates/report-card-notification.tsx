import Image from "next/image";
import * as React from "react";

interface SubjectRow {
  name: string;
  score: number | string;
  grade: string;
}

interface ReportCardEmailProps {
  guardianName: string;
  studentName: string;
  className: string;
  termName: string;
  academicYear: string;
  schoolName: string;
  schoolLogo?: string;
  average: number | null;
  position: number | null;
  positionSuffix: string;
  subjects: SubjectRow[];
  portalUrl: string;
}

function getOrdinalSuffix(n: number) {
  const j = n % 10,
    k = n % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
}

export function ReportCardEmail({
  guardianName,
  studentName,
  className,
  termName,
  academicYear,
  schoolName,
  schoolLogo,
  average,
  position,
  positionSuffix,
  subjects,
  portalUrl,
}: ReportCardEmailProps) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>Academic Report Card</title>
      </head>
      <body
        style={{
          fontFamily: "Arial, sans-serif",
          backgroundColor: "#f5f5f5",
          margin: 0,
          padding: "20px",
        }}
      >
        <div
          style={{
            maxWidth: 600,
            margin: "0 auto",
            backgroundColor: "#ffffff",
            borderRadius: 8,
            overflow: "hidden",
            border: "1px solid #e5e7eb",
          }}
        >
          {/* Header */}
          <div
            style={{
              backgroundColor: "#1e3a5f",
              padding: "24px 32px",
              textAlign: "center",
            }}
          >
            {schoolLogo && (
              <Image
                src={schoolLogo}
                alt={schoolName}
                width={60}
                height={60}
                style={{ borderRadius: 8, marginBottom: 12 }}
              />
            )}
            <h1
              style={{
                color: "#ffffff",
                fontSize: 20,
                fontWeight: "bold",
                margin: 0,
                textTransform: "uppercase",
              }}
            >
              {schoolName}
            </h1>
            <p style={{ color: "#93c5fd", fontSize: 13, margin: "8px 0 0" }}>
              Academic Report Card — {termName}, {academicYear}
            </p>
          </div>

          {/* Body */}
          <div style={{ padding: "28px 32px" }}>
            <p style={{ fontSize: 15, color: "#374151", marginTop: 0 }}>
              Dear <strong>{guardianName}</strong>,
            </p>
            <p style={{ fontSize: 14, color: "#4b5563" }}>
              We are pleased to share the academic report card for{" "}
              <strong>{studentName}</strong> ({className}) for{" "}
              <strong>
                {termName}, {academicYear}
              </strong>
              .
            </p>

            {/* Summary */}
            {(average != null || position != null) && (
              <div
                style={{
                  backgroundColor: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: 8,
                  padding: "16px 20px",
                  marginBottom: 20,
                  display: "flex",
                  gap: 40,
                }}
              >
                {average != null && (
                  <div>
                    <p
                      style={{
                        fontSize: 11,
                        color: "#6b7280",
                        margin: "0 0 4px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Average Score
                    </p>
                    <p
                      style={{
                        fontSize: 24,
                        fontWeight: "bold",
                        color: "#1d4ed8",
                        margin: 0,
                      }}
                    >
                      {average}%
                    </p>
                  </div>
                )}
                {position != null && (
                  <div>
                    <p
                      style={{
                        fontSize: 11,
                        color: "#6b7280",
                        margin: "0 0 4px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Class Position
                    </p>
                    <p
                      style={{
                        fontSize: 24,
                        fontWeight: "bold",
                        color: "#1d4ed8",
                        margin: 0,
                      }}
                    >
                      {position}
                      <sup style={{ fontSize: 14 }}>
                        {positionSuffix || getOrdinalSuffix(position)}
                      </sup>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Subject table */}
            {subjects.length > 0 && (
              <>
                <h3 style={{ fontSize: 13, color: "#374151", marginBottom: 8 }}>
                  Subject Results
                </h3>
                <table
                  width="100%"
                  cellPadding={0}
                  cellSpacing={0}
                  style={{
                    borderCollapse: "collapse",
                    fontSize: 13,
                    marginBottom: 20,
                  }}
                >
                  <thead>
                    <tr
                      style={{ backgroundColor: "#1e3a5f", color: "#ffffff" }}
                    >
                      <th
                        style={{
                          textAlign: "left",
                          padding: "8px 10px",
                          fontWeight: 600,
                        }}
                      >
                        Subject
                      </th>
                      <th
                        style={{
                          textAlign: "center",
                          padding: "8px 10px",
                          fontWeight: 600,
                        }}
                      >
                        Score
                      </th>
                      <th
                        style={{
                          textAlign: "center",
                          padding: "8px 10px",
                          fontWeight: 600,
                        }}
                      >
                        Grade
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((s, i) => (
                      <tr
                        key={i}
                        style={{
                          backgroundColor: i % 2 === 0 ? "#ffffff" : "#f9fafb",
                        }}
                      >
                        <td style={{ padding: "7px 10px", color: "#374151" }}>
                          {s.name}
                        </td>
                        <td
                          style={{
                            padding: "7px 10px",
                            textAlign: "center",
                            fontWeight: "bold",
                            color: "#1d4ed8",
                          }}
                        >
                          {s.score}
                        </td>
                        <td
                          style={{
                            padding: "7px 10px",
                            textAlign: "center",
                            color: "#374151",
                          }}
                        >
                          {s.grade}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {/* CTA */}
            <div style={{ textAlign: "center", margin: "24px 0" }}>
              <a
                href={portalUrl}
                style={{
                  backgroundColor: "#1e3a5f",
                  color: "#ffffff",
                  padding: "12px 28px",
                  borderRadius: 6,
                  textDecoration: "none",
                  fontWeight: "bold",
                  fontSize: 14,
                  display: "inline-block",
                }}
              >
                View Full Report Card
              </a>
            </div>

            <p style={{ fontSize: 13, color: "#6b7280" }}>
              You can view the full detailed report card by logging into the
              parent portal using the button above.
            </p>

            <p style={{ fontSize: 13, color: "#374151", marginBottom: 0 }}>
              Warm regards,
              <br />
              <strong>{schoolName}</strong>
            </p>
          </div>

          {/* Footer */}
          <div
            style={{
              backgroundColor: "#f9fafb",
              borderTop: "1px solid #e5e7eb",
              padding: "12px 32px",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>
              This email was sent by {schoolName} via DrewsTech Services. If you
              believe this was sent in error, please contact the school
              directly.
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
