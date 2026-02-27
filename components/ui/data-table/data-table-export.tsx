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
}

export function DataTableExport<TData>({ table }: DataTableExportProps<TData>) {
  const getExportData = () => {
    return table.getFilteredRowModel().rows.map((row) => {
      const rowData: Record<string, any> = {};
      row.getVisibleCells().forEach((cell) => {
        const header = cell.column.columnDef.header;
        let headerTitle = typeof header === "string" ? header : cell.column.id;

        if (cell.column.id === "actions" || cell.column.id === "select") return;

        const value = cell.getValue();

        if (typeof value === "object" && value !== null) {
          if ("name" in value) rowData[headerTitle] = (value as any).name;
          else if ("title" in value)
            rowData[headerTitle] = (value as any).title;
          else rowData[headerTitle] = JSON.stringify(value);
        } else {
          rowData[headerTitle] = value;
        }
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
          title="Data Export"
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
