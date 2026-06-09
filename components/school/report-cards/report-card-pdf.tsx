"use client";

import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

// Helper to proxy image URLs for bypassing CORS issues in @react-pdf/renderer
const getProxiedImageUrl = (url?: string | null) => {
  if (!url) return undefined;
  if (url.startsWith("data:")) return url; // Already base64
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/api/proxy-image?url=${encodeURIComponent(url)}`;
};

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

interface BehavioralPillar {
  pillar: string;
  value: string;
}

interface BehavioralObject {
  conduct?: string;
  attitude?: string;
  punctuality?: string;
}

interface GradeScale {
  minScore: number | string;
  maxScore: number | string;
  description: string;
}

interface SubjectResult {
  subjectName: string;
  classWorkScore?: number | string;
  examScore?: number | string;
  totalScore: number | string;
  grade: string;
  remarks?: string;
}

interface BehavioralData {
  general?: string;
  remarks?: string;
}

interface ReportData {
  studentName: string;
  studentId?: string;
  indexNo?: string;
  class: string;
  academicYear: string;
  term: string;
  position?: number | string;
  positionSuffix?: string;
  classCount?: number | string;
  outOf?: number | string;
  aggregate?: number | string;
  attendance?: string;
  totalScore?: number | string;
  studentImage?: string | null;
  schoolLogo?: string | null;
  subjects: SubjectResult[];
  behavioral?: BehavioralData;
  headmasterRemark?: string;
  classTeacherName?: string;
  classTeacherSignature?: string | null;
  headmasterName?: string;
  headmasterSignature?: string | null;
}

interface Remark {
  remarkType: "GENERAL" | "HEADTEACHER" | "BEHAVIORAL" | string;
  content: string;
}

interface GradingSystem {
  gradeScales: GradeScale[];
}

interface ReportCard {
  id: string;
  data: ReportData;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseBehavioralRemark(content?: string | null) {
  if (!content) return { conduct: "", attitude: "", punctuality: "" };
  try {
    const parsed: unknown = JSON.parse(content);
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
    ) {
      const obj = parsed as BehavioralObject;
      return {
        conduct: obj.conduct || "",
        attitude: obj.attitude || "",
        punctuality: obj.punctuality || "",
      };
    }
    if (Array.isArray(parsed)) {
      const pillars = parsed as BehavioralPillar[];
      return {
        conduct: pillars.find((r) => r.pillar === "CONDUCT")?.value || "",
        attitude: pillars.find((r) => r.pillar === "ATTITUDE")?.value || "",
        punctuality:
          pillars.find((r) => r.pillar === "PUNCTUALITY")?.value || "",
      };
    }
  } catch {
    // Ignore JSON parse error, might be raw string
  }
  return { conduct: "", attitude: "", punctuality: "" };
}

function lookupGradeDescription(score: number, scales: GradeScale[]): string {
  if (!scales || scales.length === 0) return "";
  const sorted = [...scales].sort(
    (a, b) => Number(a.minScore) - Number(b.minScore),
  );
  for (const s of sorted) {
    const min = Number(s.minScore);
    const max = Number(s.maxScore);
    if (score >= min && score <= max) {
      return s.description;
    }
  }
  return "";
}

// Styles for the PDF
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1e293b",
    backgroundColor: "#ffffff",
  },
  watermark: {
    position: "absolute",
    top: "30%",
    left: "15%",
    width: "70%",
    opacity: 0.03,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
    gap: 15,
    borderBottomWidth: 2,
    borderBottomColor: "#1e3a8a",
    paddingBottom: 6,
  },
  logo: {
    width: 55,
    height: 55,
  },
  logoPlaceholder: {
    width: 55,
    height: 55,
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  logoPlaceholderText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#cbd5e1",
  },
  headerInfoContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingRight: 55,
  },
  schoolName: {
    fontSize: 16,
    fontWeight: "bold",
    textTransform: "uppercase",
    color: "#1e3a8a",
    textAlign: "center",
  },
  schoolContact: {
    fontSize: 7,
    color: "#475569",
    marginTop: 2,
    textAlign: "center",
  },
  titleBanner: {
    marginTop: 4,
    marginBottom: 10,
    paddingVertical: 4,
    backgroundColor: "#1e3a8a",
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  bannerTitle: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  bannerSubtitle: {
    color: "#ffffff",
    fontSize: 7.5,
    opacity: 0.9,
    marginTop: 1,
  },
  studentPhotoContainer: {
    width: 55,
    height: 65,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  studentPhotoImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
  },
  photoPlaceholderText: {
    fontSize: 6,
    color: "#94a3b8",
    textAlign: "center" as const,
  },
  infoGrid: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 15,
  },
  infoColumn: {
    flex: 1,
  },
  infoItem: {
    flexDirection: "row",
    marginBottom: 4,
    fontSize: 8,
  },
  infoLabel: {
    fontWeight: "bold",
    width: 90,
    color: "#475569",
  },
  infoValue: {
    flex: 1,
    color: "#1e293b",
  },
  infoValueBold: {
    fontWeight: "bold",
  },
  table: {
    width: "100%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  tableRows: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    minHeight: 20,
    alignItems: "stretch",
  },
  tableHeader: {
    backgroundColor: "#1e3a8a",
    fontWeight: "bold",
    fontSize: 8,
    color: "#ffffff",
    minHeight: 24,
    borderBottomColor: "#1e3a8a",
  },
  tableCol: {
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
    minHeight: 20,
    justifyContent: "center",
  },
  colSubject: { width: "26%" },
  colClassScore: { width: "13%", textAlign: "center" },
  colExamScore: { width: "13%", textAlign: "center" },
  colTotal: { width: "10%", textAlign: "center" },
  colGrade: { width: "8%", textAlign: "center" },
  colRemarks: { width: "30%" },
  summaryBar: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    marginTop: 6,
    height: 22,
    alignItems: "center",
  },
  summaryItem: {
    flex: 1,
    flexDirection: "row",
    paddingHorizontal: 8,
    height: "100%",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#cbd5e1",
  },
  summaryLabel: {
    fontWeight: "bold",
    fontSize: 8,
    marginRight: 6,
    color: "#475569",
  },
  summaryValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 8,
    fontWeight: "bold",
    color: "#1e293b",
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
    color: "#1e3a8a",
    borderBottomWidth: 1.5,
    borderBottomColor: "#1e3a8a",
    paddingBottom: 2,
    marginTop: 10,
    marginBottom: 5,
  },
  remarksContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 5,
  },
  remarkCard: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    padding: 6,
    backgroundColor: "#f8fafc",
    minHeight: 45,
  },
  remarkTitle: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#64748b",
    marginBottom: 2,
  },
  remarkContent: {
    fontSize: 8,
    fontStyle: "italic",
    color: "#1e293b",
    lineHeight: 1.2,
  },
  signatureArea: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    paddingTop: 5,
  },
  signatureBlock: {
    width: "45%",
    alignItems: "center",
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: "#000000",
    paddingTop: 3,
    alignItems: "center",
    width: "100%",
  },
  signatureName: {
    fontSize: 7,
    color: "#64748b",
    textAlign: "center" as const,
    marginTop: 1,
  },
  signatureImage: {
    height: 45,
    width: 100,
    objectFit: "contain" as const,
    marginBottom: 1,
  },
  footer: {
    position: "absolute",
    bottom: 15,
    left: 30,
    right: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#6b7280",
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
    paddingTop: 4,
  },
  superscript: {
    fontSize: 5,
    position: "relative",
    top: -3,
    marginLeft: 0.5,
    color: "#2563eb",
    fontWeight: "bold",
  },
});

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

interface SchoolInfo {
  name: string;
  logo?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  headmasterName?: string | null;
}

interface ReportPageProps {
  data: ReportData;
  school: SchoolInfo;
  generalRemark: string;
  headmasterRemark: string;
  scales: GradeScale[];
}

// ---------------------------------------------------------------------------
// Shared inner page — used by both single and bulk exports
// ---------------------------------------------------------------------------

function ReportPage({
  data,
  school,
  generalRemark,
  headmasterRemark,
  scales,
}: ReportPageProps) {
  const subjects: SubjectResult[] = data.subjects || [];

  return (
    <Page size="A4" style={styles.page}>
      {/* Background Watermark */}
      {school.logo && (
        <Image src={getProxiedImageUrl(school.logo)} style={styles.watermark} />
      )}

      {/* Header */}
      <View style={styles.headerTop}>
        {data.schoolLogo || school.logo ? (
          <Image
            src={getProxiedImageUrl(data.schoolLogo || school.logo)}
            style={styles.logo}
          />
        ) : (
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoPlaceholderText}>
              {school.name
                ?.split(" ")
                .map((n: string) => n[0])
                .join("")}
            </Text>
          </View>
        )}
        <View style={styles.headerInfoContainer}>
          <Text style={styles.schoolName}>{school.name}</Text>
          <Text style={styles.schoolContact}>
            {[
              school.address,
              school.phone ? `Tel: ${school.phone}` : "",
              school.email ? `Email: ${school.email}` : "",
            ]
              .filter(Boolean)
              .join("   |   ")}
          </Text>
        </View>
      </View>

      {/* Title Banner */}
      <View style={styles.titleBanner}>
        <Text style={styles.bannerTitle}>Academic Report Card</Text>
        <Text style={styles.bannerSubtitle}>
          {data.term} • {data.academicYear}
        </Text>
      </View>

      {/* Student Info Grid */}
      <View style={styles.infoGrid}>
        {/* Column 1 */}
        <View style={styles.infoColumn}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Student Name:</Text>
            <Text style={styles.infoValue}>{data.studentName}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Student ID:</Text>
            <Text style={styles.infoValue}>
              {data.studentId || data.indexNo}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Class:</Text>
            <Text style={styles.infoValue}>{data.class}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Academic Year:</Text>
            <Text style={styles.infoValue}>{data.academicYear}</Text>
          </View>
        </View>

        {/* Column 2 */}
        <View style={styles.infoColumn}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Term:</Text>
            <Text style={styles.infoValue}>{data.term}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Class Position:</Text>
            <Text style={[styles.infoValue, styles.infoValueBold]}>
              {data.position ? (
                <>
                  {data.position}
                  {data.positionSuffix && (
                    <Text style={styles.superscript}>
                      {data.positionSuffix}
                    </Text>
                  )}
                  {` out of ${data.classCount || data.outOf || "?"}`}
                </>
              ) : (
                "—"
              )}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Aggregate (Best-6):</Text>
            <Text style={[styles.infoValue, styles.infoValueBold]}>
              {data.aggregate ?? "—"}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Attendance:</Text>
            <Text style={styles.infoValue}>{data.attendance || "—"}</Text>
          </View>
        </View>

        {/* Student Photo */}
        <View style={{ justifyContent: "center", alignItems: "flex-end" }}>
          {data.studentImage ? (
            <View style={styles.studentPhotoContainer}>
              <Image
                src={getProxiedImageUrl(data.studentImage)}
                style={styles.studentPhotoImage}
              />
            </View>
          ) : (
            <View style={styles.studentPhotoContainer}>
              <Text style={styles.photoPlaceholderText}>NO PHOTO</Text>
            </View>
          )}
        </View>
      </View>

      {/* Academic Table */}
      <View style={styles.table}>
        <View style={[styles.tableRows, styles.tableHeader]}>
          <View style={[styles.tableCol, styles.colSubject]}>
            <Text>Subject</Text>
          </View>
          <View style={[styles.tableCol, styles.colClassScore]}>
            <Text>Class Score</Text>
          </View>
          <View style={[styles.tableCol, styles.colExamScore]}>
            <Text>Exam Score</Text>
          </View>
          <View style={[styles.tableCol, styles.colTotal]}>
            <Text>Total</Text>
          </View>
          <View style={[styles.tableCol, styles.colGrade]}>
            <Text>Grade</Text>
          </View>
          <View style={[styles.tableCol, styles.colRemarks]}>
            <Text>Grade Description</Text>
          </View>
        </View>

        {subjects.map((s, i) => {
          const scoreVal =
            typeof s.totalScore === "number"
              ? s.totalScore
              : parseFloat(String(s.totalScore)) || 0;

          const remarksValid =
            s.remarks && s.remarks.trim() !== "" && s.remarks.trim() !== "—";

          const desc = remarksValid
            ? s.remarks
            : lookupGradeDescription(scoreVal, scales) || "—";
          return (
            <View key={i} style={styles.tableRows}>
              <View style={[styles.tableCol, styles.colSubject]}>
                <Text>{s.subjectName}</Text>
              </View>
              <View style={[styles.tableCol, styles.colClassScore]}>
                <Text>{Number(s.classWorkScore || 0).toFixed(1)}</Text>
              </View>
              <View style={[styles.tableCol, styles.colExamScore]}>
                <Text>{Number(s.examScore || 0).toFixed(1)}</Text>
              </View>
              <View style={[styles.tableCol, styles.colTotal]}>
                <Text>{s.totalScore}</Text>
              </View>
              <View style={[styles.tableCol, styles.colGrade]}>
                <Text>{s.grade}</Text>
              </View>
              <View style={[styles.tableCol, styles.colRemarks]}>
                <Text>{desc}</Text>
              </View>
            </View>
          );
        })}

        {/* Summary Bar */}
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Marks</Text>
            <Text style={styles.summaryValue}>{subjects.length * 100}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Marks Obtained</Text>
            <Text style={styles.summaryValue}>{data.totalScore}</Text>
          </View>
          <View style={[styles.summaryItem, { borderRightWidth: 0 }]}>
            <Text style={styles.summaryLabel}>Aggregate (Best-6)</Text>
            <Text style={styles.summaryValue}>{data.aggregate || "—"}</Text>
          </View>
        </View>
      </View>

      {/* Remarks */}
      <View>
        <Text style={styles.sectionTitle}>Remarks</Text>
        <View style={styles.remarksContainer}>
          <View style={styles.remarkCard}>
            <Text style={styles.remarkTitle}>Class Teacher&apos;s Remark</Text>
            <Text style={styles.remarkContent}>{generalRemark}</Text>
          </View>
          <View style={styles.remarkCard}>
            <Text style={styles.remarkTitle}>Headteacher&apos;s Remark</Text>
            <Text style={styles.remarkContent}>{headmasterRemark}</Text>
          </View>
        </View>
      </View>

      {/* Signatures */}
      <View style={styles.signatureArea}>
        <View style={styles.signatureBlock}>
          {data.classTeacherSignature && (
            <Image
              src={getProxiedImageUrl(data.classTeacherSignature)}
              style={styles.signatureImage}
            />
          )}
          <View style={styles.signatureLine}>
            <Text>Class Teacher</Text>
            <Text style={styles.signatureName}>
              ({data.classTeacherName || "Class Teacher"})
            </Text>
          </View>
        </View>
        <View style={styles.signatureBlock}>
          {data.headmasterSignature && (
            <Image
              src={getProxiedImageUrl(data.headmasterSignature)}
              style={styles.signatureImage}
            />
          )}
          <View style={styles.signatureLine}>
            <Text>Headteacher</Text>
            <Text style={styles.signatureName}>
              ({data.headmasterName || school.headmasterName || "Headteacher"})
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text>
          This report card was generated by {school.name} •{" "}
          {new Date().getFullYear()} • Powered by DrewsTech Services
        </Text>
        <Text
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </View>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Public exports
// ---------------------------------------------------------------------------

interface ReportCardPDFProps {
  data: ReportData;
  school: SchoolInfo;
  remarks?: Remark[];
  gradingSystem?: GradingSystem;
}

export const ReportCardPDF = ({
  data,
  school,
  remarks,
  gradingSystem,
}: ReportCardPDFProps) => {
  const scales = gradingSystem?.gradeScales ?? [];

  const generalRemark =
    remarks?.find((r) => r.remarkType === "GENERAL")?.content ||
    data.behavioral?.general ||
    data.behavioral?.remarks ||
    "—";

  const headmasterRemark =
    remarks?.find((r) => r.remarkType === "HEADTEACHER")?.content ||
    data.headmasterRemark ||
    "—";

  return (
    <Document>
      <ReportPage
        data={data}
        school={school}
        generalRemark={generalRemark}
        headmasterRemark={headmasterRemark}
        scales={scales}
      />
    </Document>
  );
};

export const BulkReportPDF = ({
  reportCards,
  school,
  gradingSystem,
}: {
  reportCards: ReportCard[];
  school: SchoolInfo;
  gradingSystem?: GradingSystem;
}) => {
  const scales = gradingSystem?.gradeScales ?? [];

  return (
    <Document>
      {reportCards.map((rc) => {
        const data: ReportData = rc.data;

        const behavioralRaw = data.behavioral?.remarks || "";
        const behavioral = parseBehavioralRemark(behavioralRaw);

        const generalRemark =
          behavioral.conduct ||
          data.behavioral?.general ||
          data.behavioral?.remarks ||
          "—";

        const headmasterRemark = data.headmasterRemark || "—";

        return (
          <ReportPage
            key={rc.id}
            data={data}
            school={school}
            generalRemark={generalRemark}
            headmasterRemark={headmasterRemark}
            scales={scales}
          />
        );
      })}
    </Document>
  );
};
