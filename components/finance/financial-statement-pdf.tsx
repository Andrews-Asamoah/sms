"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 40,
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 15,
  },
  schoolName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  reportTitle: {
    fontSize: 14,
    color: "#4b5563",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  periodBadge: {
    marginTop: 8,
    fontSize: 10,
    color: "#6b7280",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#374151",
    backgroundColor: "#f9fafb",
    padding: 6,
    marginTop: 20,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  label: {
    fontSize: 10,
    color: "#4b5563",
  },
  value: {
    fontSize: 10,
    fontWeight: "medium",
    color: "#111827",
  },
  revenueValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#059669",
  },
  expenseValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#dc2626",
  },
  netIncomeSection: {
    marginTop: 30,
    paddingTop: 15,
    borderTopWidth: 2,
    borderTopColor: "#111827",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  netIncomeLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#111827",
  },
  netIncomeValue: {
    fontSize: 14,
    fontWeight: "bold",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#9ca3af",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
  },
});

interface FinancialStatementPDFProps {
  data: any;
  schoolName: string;
}

export const FinancialStatementPDF = ({ data, schoolName }: FinancialStatementPDFProps) => {
  const formatter = new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: data?.currency || "GHS",
  });

  const netIncome = (data?.revenue || 0) - (data?.expenses || 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.schoolName}>{schoolName}</Text>
          <Text style={styles.reportTitle}>Financial Income Statement</Text>
          <Text style={styles.periodBadge}>
            Period: {data?.currentYearName || "All Time"} 
            {data?.currentTermName ? ` — ${data.currentTermName}` : ""}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Revenue</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Collected Fee Payments</Text>
          <Text style={styles.revenueValue}>{formatter.format(data?.revenue || 0)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Outstanding Balance (Receivables)</Text>
          <Text style={styles.value}>{formatter.format(data?.outstanding || 0)}</Text>
        </View>

        <Text style={styles.sectionTitle}>Expenses & Payroll</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Operating Expenses</Text>
          <Text style={styles.expenseValue}>-{formatter.format(data?.expenses || 0)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Staff Payroll (Gross)</Text>
          <Text style={styles.expenseValue}>-{formatter.format(data?.payroll?.gross || 0)}</Text>
        </View>

        <View style={styles.netIncomeSection}>
          <Text style={styles.netIncomeLabel}>NET INCOME</Text>
          <Text style={[styles.netIncomeValue, { color: netIncome >= 0 ? "#059669" : "#dc2626" }]}>
            {formatter.format(netIncome)}
          </Text>
        </View>

        <View style={{ marginTop: 40 }}>
          <Text style={{ fontSize: 10, fontWeight: "bold", marginBottom: 10 }}>Breakdown by Category</Text>
          {data?.revenueBreakdown?.map((rev: any, i: number) => (
            <View key={`rev-${i}`} style={styles.row}>
              <Text style={styles.label}>{rev.name} (Revenue)</Text>
              <Text style={styles.revenueValue}>{formatter.format(rev.amount)}</Text>
            </View>
          ))}
          {data?.expenseBreakdown?.map((exp: any, i: number) => (
            <View key={`exp-${i}`} style={styles.row}>
              <Text style={styles.label}>{exp.name} (Expense)</Text>
              <Text style={styles.expenseValue}>-{formatter.format(exp.amount)}</Text>
            </View>
          ))}
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Financial Statement - Page ${pageNumber} of ${totalPages} - Generated on ${new Date().toLocaleDateString()}`
          }
          fixed
        />
      </Page>
    </Document>
  );
};
