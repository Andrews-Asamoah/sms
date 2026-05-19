"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: "#111827",
    paddingBottom: 15,
    marginBottom: 20,
  },
  schoolInfo: {
    flex: 1,
  },
  schoolDetails: {
    fontSize: 10,
    color: "#4b5563",
    marginTop: 2,
  },
  detailLabel: {
    fontSize: 8,
    color: "#6b7280",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 11,
    color: "#111827",
    fontWeight: "bold",
  },
  logo: {
    width: 60,
    height: 60,
    objectFit: "contain",
  },
  logoPlaceholder: {
    width: 60,
    height: 60,
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  logoPlaceholderText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#cbd5e1",
  },
  schoolName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  detailsGrid: {
    flexDirection: "row",
    marginBottom: 30,
    gap: 20,
  },
  detailColumn: {
    flex: 1,
  },
  billTitleContainer: {
    marginVertical: 15,
    padding: 10,
    backgroundColor: "#f9fafb",
    borderLeftWidth: 4,
    borderLeftColor: "#111827",
  },
  billTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#111827",
    textTransform: "uppercase",
  },
  table: {
    marginTop: 5,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    padding: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    padding: 8,
  },
  colDescription: { flex: 3 },
  colQty: { flex: 0.5, textAlign: "center" },
  colPrice: { flex: 1, textAlign: "right" },
  colTotal: { flex: 1, textAlign: "right" },
  headerText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#374151",
  },
  rowText: {
    fontSize: 9,
    color: "#4b5563",
  },
  summary: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  summaryBox: {
    width: 200,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 10,
    color: "#4b5563",
  },
  summaryValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#111827",
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#111827",
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#111827",
  },
  notesSection: {
    marginTop: 40,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  notesText: {
    fontSize: 9,
    color: "#6b7280",
    lineHeight: 1.4,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 8,
    color: "#9ca3af",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
  },
});

interface InvoiceData {
  billNumber: string;
  studentName: string;
  studentId: string;
  className: string;
  issuedAt: string;
  dueDate: string;
  items: {
    description: string;
    amount: number;
    quantity: number;
    totalAmount: number;
  }[];
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  notes?: string | null;
  feeStructureName?: string;
}

interface BatchInvoicePDFProps {
  invoices: InvoiceData[];
  schoolName: string;
  schoolAddress?: string | null;
  schoolEmail?: string | null;
  schoolPhone?: string | null;
  currency: string;
  logoUrl?: string;
}

/** Converts TipTap / rich-text HTML to readable plain text for use in react-pdf */
function htmlToPlainText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<\/p>/gi, "\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const BatchInvoicePDF = ({
  invoices,
  schoolName,
  schoolAddress,
  schoolEmail,
  schoolPhone,
  currency,
  logoUrl,
}: BatchInvoicePDFProps) => {
  const formatCurrency = (amount: number) => {
    // Standardize to GHS if the symbol is causing issues,
    // but try to keep the symbol logic if it can be fixed.
    // For now, using a more stable GH₵ representation or GHS fallback
    const displayCurrency =
      currency === "GH₵" || currency === "GHS" ? "GHS" : currency;
    return `${displayCurrency} ${Number(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <Document>
      {invoices.map((invoice, index) => (
        <Page key={invoice.billNumber || index} size="A4" style={styles.page}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: "row", flex: 1 }}>
              {logoUrl ? (
                <Image
                  src={{
                    uri: logoUrl,
                    method: "GET",
                    headers: { "Cache-Control": "no-cache" },
                    body: ""
                  }}
                  style={[styles.logo, { marginRight: 15 }]}
                />
              ) : (
                <View style={[styles.logoPlaceholder, { marginRight: 15 }]}>
                  <Text style={styles.logoPlaceholderText}>
                    {schoolName
                      ?.split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .substring(0, 2)}
                  </Text>
                </View>
              )}
              <View style={styles.schoolInfo}>
                <Text style={styles.schoolName}>{schoolName}</Text>
                {schoolAddress && (
                  <Text style={styles.schoolDetails}>{schoolAddress}</Text>
                )}
                {(schoolEmail || schoolPhone) && (
                  <Text style={styles.schoolDetails}>
                    {[schoolEmail, schoolPhone].filter(Boolean).join(" | ")}
                  </Text>
                )}
                <Text
                  style={[
                    styles.schoolDetails,
                    { marginTop: 4, color: "#9ca3af" },
                  ]}
                >
                  Official Student Invoice
                </Text>
              </View>
            </View>
            <View style={{ textAlign: "right" }}>
              <Text
                style={{ fontSize: 24, fontWeight: "bold", color: "#111827" }}
              >
                INVOICE
              </Text>
              <Text style={{ fontSize: 12, color: "#4b5563", marginTop: 4 }}>
                #{invoice.billNumber}
              </Text>
            </View>
          </View>

          {/* Bill Title */}
          <View style={styles.billTitleContainer}>
            <Text style={styles.billTitle}>
              {invoice.feeStructureName || "FEE INVOICE"}
            </Text>
          </View>

          {/* Details Grid */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailColumn}>
              <Text style={styles.detailLabel}>Bill To</Text>
              <Text style={styles.detailValue}>{invoice.studentName}</Text>
              <Text style={styles.detailLabel}>ID: {invoice.studentId}</Text>
              <Text style={styles.detailLabel}>Class: {invoice.className}</Text>
            </View>
            <View style={styles.detailColumn}>
              <Text style={styles.detailLabel}>Date Issued</Text>
              <Text style={styles.detailValue}>
                {new Date(invoice.issuedAt).toLocaleDateString()}
              </Text>
              <View style={{ marginTop: 8 }}>
                <Text style={styles.detailLabel}>Due Date</Text>
                <Text style={styles.detailValue}>
                  {new Date(invoice.dueDate).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>

          {/* Items Table */}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.headerText, styles.colDescription]}>
                Description
              </Text>
              <Text style={[styles.headerText, styles.colQty]}>Qty</Text>
              <Text style={[styles.headerText, styles.colPrice]}>
                Unit Price
              </Text>
              <Text style={[styles.headerText, styles.colTotal]}>Total</Text>
            </View>
            {invoice.items.map((item, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.rowText, styles.colDescription]}>
                  {item.description}
                </Text>
                <Text style={[styles.rowText, styles.colQty]}>
                  {item.quantity}
                </Text>
                <Text style={[styles.rowText, styles.colPrice]}>
                  {formatCurrency(item.amount)}
                </Text>
                <Text style={[styles.rowText, styles.colTotal]}>
                  {formatCurrency(item.totalAmount)}
                </Text>
              </View>
            ))}
          </View>

          {/* Summary */}
          <View style={styles.summary}>
            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(invoice.totalAmount)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Paid Amount</Text>
                <Text style={[styles.summaryValue, { color: "#059669" }]}>
                  -{formatCurrency(invoice.paidAmount)}
                </Text>
              </View>
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>TOTAL DUE</Text>
                <Text style={styles.grandTotalValue}>
                  {formatCurrency(invoice.balanceAmount)}
                </Text>
              </View>
            </View>
          </View>

          {/* Notes */}
          {invoice.notes && (
            <View style={styles.notesSection}>
              <Text style={styles.notesTitle}>Notes &amp; Instructions</Text>
              <Text style={styles.notesText}>
                {htmlToPlainText(invoice.notes)}
              </Text>
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer} fixed>
            <Text style={{ marginTop: 2, fontSize: 7, color: "#d1d5db" }}>
              CampusAdesua | Powered by Drews_Tech_Services
            </Text>
          </View>
        </Page>
      ))}
    </Document>
  );
};
