"use client";

import { Table } from "@tanstack/react-table";
import { Download, Printer, FileSpreadsheet, FileText } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DataTableExportProps<TData> {
  table: Table<TData>;
  exportTitle?: string;
  orientation?: "portrait" | "landscape";
}

export function DataTableExport<TData>({ 
  table, 
  exportTitle,
  orientation = "portrait"
}: DataTableExportProps<TData>) {
  const formatExportValue = (value: any): string => {
    if (value === null || value === undefined) return "";

    // 1. Handle Dates
    if (value instanceof Date) {
      return value.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }

    // Check if string is a valid ISO date
    if (
      typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
    ) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }
    }

    // 2. Handle Objects (Profiles, Students, Categories, Bills)
    if (typeof value === "object") {
      // Priority 1: Full Name from Profile
      if (value.profile) {
        const p = value.profile;
        return [p.firstName, p.otherNames, p.lastName]
          .filter(Boolean)
          .join(" ");
      }

      // Priority 2: Bill Item / Fee Structure
      if ("billNumber" in value || "feeStructure" in value) {
        return value.feeStructure?.name || value.billNumber || "N/A";
      }

      // Priority 3: Standard Name/Title fields
      if ("name" in value) return String(value.name);
      if ("title" in value) return String(value.title);
      if ("firstName" in value && "lastName" in value) {
        return `${value.firstName} ${value.lastName}`;
      }

      // Priority 4: Search for any string field that looks like a label
      const stringValues = Object.values(value).filter(
        (v) => typeof v === "string" && v.length < 50,
      );
      if (stringValues.length > 0) return String(stringValues[0]);

      // Fallback: Clean string representation
      return "[Object]";
    }

    // 3. Handle Numbers (Currency/Amount)
    if (typeof value === "number") {
      return value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }

    return String(value);
  };

  const getExportData = () => {
    return table.getFilteredRowModel().rows.map((row) => {
      const rowData: Record<string, any> = {};
      row.getVisibleCells().forEach((cell) => {
        const header = cell.column.columnDef.header;
        let headerTitle = typeof header === "string" ? header : cell.column.id;

        if (cell.column.id === "actions" || cell.column.id === "select") return;

        rowData[headerTitle] = formatExportValue(cell.getValue());
      });
      return rowData;
    });
  };

  const exportToExcel = () => {
    const data = getExportData();
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, "export.xlsx");
  };

  const exportToPDF = async () => {
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { DataTablePDFDocument } =
        await import("./data-table-pdf-document");

      const data = getExportData();

      // Get visible columns (excluding actions and select)
      const exportColumns = table
        .getVisibleFlatColumns()
        .filter((col) => col.id !== "actions" && col.id !== "select")
        .map((col) => {
          const header = col.columnDef.header;
          return {
            header: typeof header === "string" ? header : col.id,
            accessor: typeof header === "string" ? header : col.id,
          };
        });

      const blob = await pdf(
        <DataTablePDFDocument
          data={data}
          columns={exportColumns}
          title={exportTitle || "Data Export"}
          orientation={orientation}
        />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "export.pdf";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export PDF:", error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto hidden h-8 lg:flex"
        >
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[150px]">
        <DropdownMenuItem onClick={exportToExcel}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPDF}>
          <FileText className="mr-2 h-4 w-4" />
          PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
