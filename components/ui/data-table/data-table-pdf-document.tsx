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
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 30,
    backgroundColor: "#ffffff",
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: "center",
    color: "#1a1a1a",
    fontWeight: "bold",
  },
  table: {
    display: "flex",
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    margin: "auto",
    flexDirection: "row",
    backgroundColor: "#ffffff",
  },
  tableHeader: {
    backgroundColor: "#f9fafb",
  },
  tableCol: {
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 8,
  },
  tableCellHeader: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#374151",
  },
  tableCell: {
    fontSize: 9,
    color: "#4b5563",
  },
  footer: {
    position: "absolute",
    bottom: 20,
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
  // Calculate column widths proportionately
  const colWidth = 100 / columns.length;

  return (
    <Document>
      <Page size="A4" orientation={orientation} style={styles.page}>
        <Text style={styles.title}>{title}</Text>

        <View style={styles.table}>
          {/* Header */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            {columns.map((col, i) => (
              <View
                key={i}
                style={[styles.tableCol, { width: `${colWidth}%` }]}
              >
                <Text style={styles.tableCellHeader}>{col.header}</Text>
              </View>
            ))}
          </View>

          {/* Rows */}
          {data.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.tableRow}>
              {columns.map((col, colIndex) => (
                <View
                  key={colIndex}
                  style={[styles.tableCol, { width: `${colWidth}%` }]}
                >
                  <Text style={styles.tableCell}>
                    {row[col.accessor] !== undefined &&
                    row[col.accessor] !== null
                      ? String(row[col.accessor])
                      : ""}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Page ${pageNumber} of ${totalPages} - Generated on ${new Date().toLocaleDateString()}`
          }
          fixed
        />
      </Page>
    </Document>
  );
};
