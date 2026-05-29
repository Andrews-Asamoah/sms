"use client";

import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image,
  Link,
} from "@react-pdf/renderer";

// Styles for the PDF
const styles = StyleSheet.create({
  page: {
    padding: 45,
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
  headerBanner: {
    textAlign: "center",
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 20,
  },
  logo: {
    width: 60,
    height: 60,
  },
  headerInfoGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  headerInfoItem: {
    width: "48%",
    flexDirection: "row",
    marginBottom: 2,
    fontSize: 9,
  },
  headerInfoLabel: {
    fontWeight: "bold",
    marginRight: 4,
  },
  schoolName: {
    fontSize: 16,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 4,
    color: "#000000",
    textAlign: "left",
  },
  reportType: {
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 15,
    textTransform: "uppercase",
    color: "#f59e0b", // Orange
    textAlign: "center",
  },
  studentPhoto: {
    width: 70,
    height: 70,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
  },
  studentPhotoContainer: {
    width: 60,
    height: 70,
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
    marginBottom: 20,
    gap: 15,
  },
  infoColumn: {
    flex: 1,
  },
  infoItem: {
    flexDirection: "row",
    marginBottom: 5,
    fontSize: 8,
  },
  infoLabel: {
    fontWeight: "bold",
    width: "45%",
    color: "#000000",
  },
  infoValue: {
    flex: 1,
    color: "#000000",
  },
  infoValueBold: {
    fontWeight: "bold",
  },
  remarksBox: {
    fontSize: 8,
    marginTop: 4,
  },
  table: {
    width: "100%",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#334155",
  },
  tableRows: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    minHeight: 24,
    alignItems: "center",
  },
  tableHeader: {
    backgroundColor: "#f1f5f9",
    fontWeight: "bold",
    fontSize: 9,
    color: "#1e293b",
    height: 28,
  },
  tableCol: {
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: "#000",
    height: "100%",
    justifyContent: "center",
  },
  colSubject: { width: "30%" },
  colClassScore: { width: "10%", textAlign: "center" },
  colExamScore: { width: "10%", textAlign: "center" },
  colTotal: { width: "10%", textAlign: "center" },
  colGrade: { width: "10%", textAlign: "center" },
  colRemarks: { width: "30%" },

  summaryBar: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    marginTop: 10,
    height: 25,
    alignItems: "center",
  },
  summaryItem: {
    flex: 1,
    flexDirection: "row",
    paddingHorizontal: 10,
    height: "100%",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#cbd5e1",
  },
  summaryLabel: {
    fontWeight: "bold",
    fontSize: 9,
    marginRight: 10,
  },
  summaryValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 9,
  },
  remarkRow: {
    flexDirection: "row",
    marginBottom: 8,
    minHeight: 18,
  },
  remarkLabel: {
    width: "20%",
    fontWeight: "bold",
    color: "#475569",
  },
  remarkValue: {
    flex: 1,
    borderBottomWidth: 0.5,
    borderBottomColor: "#94a3b8",
    fontStyle: "italic",
    paddingBottom: 2,
    color: "#1e293b",
    lineHeight: 1.4,
  },

  signatureArea: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 25,
    paddingTop: 10,
  },
  signatureBlock: {
    width: "45%",
    alignItems: "center",
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: "#000000",
    paddingTop: 4,
    alignItems: "center",
    width: "100%",
  },
  signatureName: {
    fontSize: 7,
    color: "#64748b",
    textAlign: "center" as const,
    marginTop: 2,
  },
  signatureImage: {
    height: 25,
    width: 70,
    objectFit: "contain" as const,
    marginBottom: 2,
  },

  // Superscript Suffix
  superscript: {
    fontSize: 5,
    position: "relative",
    top: -3,
    marginLeft: 0.5,
    color: "#2563eb",
    fontWeight: "bold",
  },

  // Photo Placeholder
  placeholderText: {
    fontSize: 20,
    color: "#94a3b8",
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 35,
  },

  // School Logo Placeholder
  logoPlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  logoPlaceholderText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#cbd5e1",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#6b7280",
    borderTopWidth: 0.5,
    borderTopColor: "#e5e7eb",
    paddingTop: 5,
  },
});

interface ReportCardPDFProps {
  data: any;
  school: any;
}

export const ReportCardPDF = ({ data, school }: ReportCardPDFProps) => {
  const isMock = true; // For now hardcoded, can be derived from data property

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Background Watermark/Logo */}
        {school.logo && <Image src={school.logo} style={styles.watermark} />}

        <View style={styles.headerTop}>
          {data.schoolLogo || school.logo ? (
            <Image src={data.schoolLogo || school.logo} style={styles.logo} />
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
          <View style={styles.headerInfoGrid}>
            <View style={{ width: "100%" }}>
              <Text style={styles.schoolName}>{school.name}</Text>
            </View>
            <View style={styles.headerInfoItem}>
              <Text style={styles.headerInfoLabel}>Contact:</Text>
              <Text>{school.phone || "0249818556"}</Text>
            </View>
            <View style={styles.headerInfoItem}>
              <Text style={styles.headerInfoLabel}>P.O.BOX:</Text>
              <Text>{data.schoolPOBox || "KF 222"}</Text>
            </View>
            <View style={styles.headerInfoItem}>
              <Text style={styles.headerInfoLabel}>GPS ADDRESS:</Text>
              <Text>{data.schoolGPS || "EN-075-3409"}</Text>
            </View>
            <View style={styles.headerInfoItem}>
              <Text style={styles.headerInfoLabel}>Email:</Text>
              <Text>{school.email || "info@wis.com"}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.reportType}>
          RESULTS SLIP FOR {data.term}, {data.academicYear} ACADEMIC YEAR
        </Text>

        {/* Student/Teacher Information Grid */}
        <View style={styles.infoGrid}>
          {/* Column 1 */}
          <View style={styles.infoColumn}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Name:</Text>
              <Text style={styles.infoValue}>{data.studentName}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Index No.:</Text>
              <Text style={styles.infoValue}>{data.indexNo}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{data.studentEmail}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Attendance:</Text>
              <Text style={[styles.infoValue, styles.infoValueBold]}>
                {data.attendance}
              </Text>
            </View>
          </View>

          {/* Column 2 */}
          <View style={styles.infoColumn}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Class:</Text>
              <Text style={styles.infoValue}>{data.class}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Student ID:</Text>
              <Text style={styles.infoValue}>{data.studentId}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Position:</Text>
              <Text style={[styles.infoValue, styles.infoValueBold]}>
                {data.position}
                {data.positionSuffix}
              </Text>
            </View>
          </View>

          {/* Column 3 */}
          <View style={styles.infoColumn}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Class Teacher:</Text>
              <Text style={styles.infoValue}>{data.classTeacherName}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Out of:</Text>
              <Text style={[styles.infoValue, styles.infoValueBold]}>
                {data.classCount}
              </Text>
            </View>
            <View style={styles.remarksBox}>
              <Text style={{ fontWeight: "bold" }}>
                Class Teacher's Remarks:
              </Text>
              <Text>
                {data.behavioral?.general ||
                  data.behavioral?.remarks ||
                  "Should be more attentive in class."}
              </Text>
            </View>
          </View>

          {/* Student Photo */}
          <View style={{ justifyContent: "center", alignItems: "flex-end" }}>
            {data.studentImage ? (
              <View style={styles.studentPhotoContainer}>
                <Image src={data.studentImage} style={styles.studentPhotoImage} />
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
              <Text>Remarks</Text>
            </View>
          </View>

          {data.subjects.map((s: any, i: number) => (
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
                <Text>{s.remarks || "Excellent"}</Text>
              </View>
            </View>
          ))}

          {/* Summary Bar */}
          <View style={styles.summaryBar}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Marks</Text>
              <Text style={styles.summaryValue}>
                {data.subjects.length * 100}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Marks Obtained</Text>
              <Text style={styles.summaryValue}>{data.totalScore}</Text>
            </View>
            <View style={[styles.summaryItem, { borderRightWidth: 0 }]}>
              <Text style={styles.summaryLabel}>Grades Obtained</Text>
              <Text style={styles.summaryValue}>{data.aggregate}</Text>
            </View>
          </View>
        </View>

        {/* Signatures */}
        <View style={styles.signatureArea}>
          {/* Class Teacher */}
          <View style={styles.signatureBlock}>
            {data.classTeacherSignature && (
              <Image
                src={data.classTeacherSignature}
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
          {/* Headteacher */}
          <View style={styles.signatureBlock}>
            {data.headmasterSignature && (
              <Image
                src={data.headmasterSignature}
                style={styles.signatureImage}
              />
            )}
            <View style={styles.signatureLine}>
              <Text>Headteacher</Text>
              <Text style={styles.signatureName}>
                ({data.headmasterName ||
                  school.headmasterName ||
                  "Headteacher"})
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>
            Powered By DrewsTech Services (
            <Link
              src="https://drewstechservices.com"
              style={{ color: "#2563eb", textDecoration: "underline" }}
            >
              https://drewstechservices.com
            </Link>
            )
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
            fixed
          />
        </View>
      </Page>
    </Document>
  );
};

export const BulkReportPDF = ({
  reportCards,
  school,
}: {
  reportCards: any[];
  school: any;
}) => (
  <Document>
    {reportCards.map((rc) => (
      <Page key={rc.id} size="A4" style={styles.page}>
        {/* Background Watermark/Logo */}
        {school.logo && <Image src={school.logo} style={styles.watermark} />}

        <View style={styles.headerTop}>
          {rc.data.schoolLogo || school.logo ? (
            <Image
              src={rc.data.schoolLogo || school.logo}
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
          <View style={styles.headerInfoGrid}>
            <View style={{ width: "100%" }}>
              <Text style={styles.schoolName}>{school.name}</Text>
            </View>
            <View style={styles.headerInfoItem}>
              <Text style={styles.headerInfoLabel}>Contact:</Text>
              <Text>{school.phone || "0249818556"}</Text>
            </View>
            <View style={styles.headerInfoItem}>
              <Text style={styles.headerInfoLabel}>P.O.BOX:</Text>
              <Text>{rc.data.schoolPOBox || "KF 222"}</Text>
            </View>
            <View style={styles.headerInfoItem}>
              <Text style={styles.headerInfoLabel}>GPS ADDRESS:</Text>
              <Text>{rc.data.schoolGPS || "EN-075-3409"}</Text>
            </View>
            <View style={styles.headerInfoItem}>
              <Text style={styles.headerInfoLabel}>Email:</Text>
              <Text>{school.email || "info@wis.com"}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.reportType}>
          RESULTS SLIP FOR {rc.data.term}, {rc.data.academicYear} ACADEMIC YEAR
        </Text>

        {/* Student/Teacher Information Grid */}
        <View style={styles.infoGrid}>
          {/* Column 1 */}
          <View style={styles.infoColumn}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Name:</Text>
              <Text style={styles.infoValue}>{rc.data.studentName}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Index No.:</Text>
              <Text style={styles.infoValue}>{rc.data.indexNo}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{rc.data.studentEmail}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Attendance:</Text>
              <Text style={[styles.infoValue, styles.infoValueBold]}>
                {rc.data.attendance}
              </Text>
            </View>
          </View>

          {/* Column 2 */}
          <View style={styles.infoColumn}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Class:</Text>
              <Text style={styles.infoValue}>{rc.data.class}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Student ID:</Text>
              <Text style={styles.infoValue}>{rc.data.studentId}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Position:</Text>
              <Text style={[styles.infoValue, styles.infoValueBold]}>
                {rc.data.position}
                {rc.data.positionSuffix}
              </Text>
            </View>
          </View>

          {/* Column 3 */}
          <View style={styles.infoColumn}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Class Teacher:</Text>
              <Text style={styles.infoValue}>{rc.data.classTeacherName}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Out of:</Text>
              <Text style={[styles.infoValue, styles.infoValueBold]}>
                {rc.data.classCount}
              </Text>
            </View>
            <View style={styles.remarksBox}>
              <Text style={{ fontWeight: "bold" }}>
                Class Teacher's Remarks:
              </Text>
              <Text>
                {rc.data.behavioral?.general ||
                  rc.data.behavioral?.remarks ||
                  "Should be more attentive in class."}
              </Text>
            </View>
          </View>

          {/* Student Photo */}
          <View style={{ justifyContent: "center", alignItems: "flex-end" }}>
            {rc.data.studentImage ? (
              <View style={styles.studentPhotoContainer}>
                <Image src={rc.data.studentImage} style={styles.studentPhotoImage} />
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
              <Text>Remarks</Text>
            </View>
          </View>

          {rc.data.subjects.map((s: any, i: number) => (
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
                <Text>{s.remarks || "Excellent"}</Text>
              </View>
            </View>
          ))}

          {/* Summary Bar */}
          <View style={styles.summaryBar}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Marks</Text>
              <Text style={styles.summaryValue}>
                {rc.data.subjects.length * 100}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Marks Obtained</Text>
              <Text style={styles.summaryValue}>{rc.data.totalScore}</Text>
            </View>
            <View style={[styles.summaryItem, { borderRightWidth: 0 }]}>
              <Text style={styles.summaryLabel}>Grades Obtained</Text>
              <Text style={styles.summaryValue}>{rc.data.aggregate}</Text>
            </View>
          </View>
        </View>

        {/* Signatures */}
        <View style={styles.signatureArea}>
          {/* Class Teacher */}
          <View style={styles.signatureBlock}>
            {rc.data.classTeacherSignature && (
              <Image
                src={rc.data.classTeacherSignature}
                style={styles.signatureImage}
              />
            )}
            <View style={styles.signatureLine}>
              <Text>Class Teacher</Text>
              <Text style={styles.signatureName}>
                ({rc.data.classTeacherName || "Class Teacher"})
              </Text>
            </View>
          </View>
          {/* Headteacher */}
          <View style={styles.signatureBlock}>
            {rc.data.headmasterSignature && (
              <Image
                src={rc.data.headmasterSignature}
                style={styles.signatureImage}
              />
            )}
            <View style={styles.signatureLine}>
              <Text>Headteacher</Text>
              <Text style={styles.signatureName}>
                ({rc.data.headmasterName ||
                  school.headmasterName ||
                  "Headteacher"})
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>
            Powered By DrewsTech Services (https://drewstechservices.com)
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
            fixed
          />
        </View>
      </Page>
    ))}
  </Document>
);

function getOrdinalSuffix(i: number) {
  const j = i % 10,
    k = i % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
}
