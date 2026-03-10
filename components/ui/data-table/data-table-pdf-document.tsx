"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// Register fonts if needed, or use defaults
// Font.register({ family: 'Inter', src: '...' });

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#1a1a1a",
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a1a1a",
    textTransform: "uppercase",
  },
  meta: {
    fontSize: 9,
    color: "#6b7280",
  },
  table: {
    display: "flex",
    width: "auto",
    marginTop: 10,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    minHeight: 25,
    alignItems: "center",
  },
  tableHeader: {
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 2,
    borderBottomColor: "#374151",
  },
  tableCol: {
    padding: 6,
  },
  tableCellHeader: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#1f2937",
  },
  tableCell: {
    fontSize: 9,
    color: "#374151",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#9ca3af",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
});

interface PDFDocumentProps {
  data: any[];
  columns: { header: string; accessor: string }[];
  title?: string;
  orientation?: "portrait" | "landscape";
}

export const DataTablePDFDocument = ({
  data,
  columns,
  title = "Data Export",
  orientation = "portrait",
}: PDFDocumentProps) => {
  // Calculate relative weights for columns
  const getWeight = (header: string) => {
    const h = header.toLowerCase();
    if (h.includes("student") || h.includes("name") || h.includes("description") || h.includes("notes")) return 2;
    if (h.includes("id") || h.includes("#") || h.includes("date") || h.includes("method")) return 0.8;
    return 1;
  };

  const totalWeight = columns.reduce((acc, col) => acc + getWeight(col.header), 0);

  return (
    <Document>
      <Page size="A4" orientation={orientation} style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.meta}>
            Generated: {new Date().toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.table}>
          {/* Header */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            {columns.map((col, i) => {
              const width = (getWeight(col.header) / totalWeight) * 100;
              return (
                <View
                  key={i}
                  style={[styles.tableCol, { width: `${width}%` }]}
                >
                  <Text style={styles.tableCellHeader}>{col.header}</Text>
                </View>
              );
            })}
          </View>

          {/* Rows */}
          {data.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.tableRow}>
              {columns.map((col, colIndex) => {
                const width = (getWeight(col.header) / totalWeight) * 100;
                return (
                  <View
                    key={colIndex}
                    style={[styles.tableCol, { width: `${width}%` }]}
                  >
                    <Text style={[styles.tableCell, { flexWrap: "wrap" }]}>
                      {row[col.accessor] !== undefined &&
                      row[col.accessor] !== null
                        ? String(row[col.accessor])
                        : ""}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
};
