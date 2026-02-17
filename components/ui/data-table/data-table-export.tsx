"use client";

import { Table } from "@tanstack/react-table";
import { Download, Printer, FileSpreadsheet } from "lucide-react";
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
  const exportToExcel = () => {
    const data = table.getFilteredRowModel().rows.map((row) => {
      // Create a clean object with only visible columns and their values
      const rowData: Record<string, any> = {};
      row.getVisibleCells().forEach((cell) => {
        const header = cell.column.columnDef.header;
        let headerTitle = typeof header === "string" ? header : cell.column.id;

        // Skip actions column and generic headers
        if (cell.column.id === "actions" || cell.column.id === "select") return;

        // Try to get a string value
        // value could be complex object, string, number etc.
        const value = cell.getValue();

        // If value is object (like date or related entity), try to simplify
        if (typeof value === "object" && value !== null) {
          // Basic heuristic for typical data objects
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

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, "export.xlsx");
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
        <DropdownMenuItem onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
