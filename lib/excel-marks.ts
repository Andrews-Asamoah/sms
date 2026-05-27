/**
 * Excel Marks Utility
 * Handles generation and parsing of marks entry Excel files.
 * Uses the `xlsx` (SheetJS) library for cross-platform compatibility.
 */
import * as XLSX from "xlsx";
import { AssessmentComponent, GradebookStudent, GradebookTemplate } from "@/app/(school)/[schoolSlug]/teacher/classes/[classSlug]/gradebook/types";

// ─── Column Definitions ───────────────────────────────────────────────────────

interface ColumnDef {
  /** Display header shown in the Excel sheet */
  header: string;
  /** Internal key used to map back to componentId + index */
  key: string;
  /** The component this column belongs to */
  componentId: string;
  /** For repeatable components: which occurrence index (0-based) */
  repeatIndex?: number;
  /** Max marks for validation comment */
  maxMarks: number;
}

/**
 * Build a flat list of columns from an assessment template.
 * Repeatable components (e.g. "Class Test" × 3) expand into multiple columns.
 */
export function buildColumnDefs(components: AssessmentComponent[]): ColumnDef[] {
  const cols: ColumnDef[] = [];
  for (const comp of components) {
    if (comp.isRepeatable && comp.expectedCount && comp.expectedCount > 1) {
      for (let i = 0; i < comp.expectedCount; i++) {
        cols.push({
          header: `${comp.name} ${i + 1} (Max: ${comp.maxMarks})`,
          key: `${comp.id}__${i}`,
          componentId: comp.id,
          repeatIndex: i,
          maxMarks: Number(comp.maxMarks),
        });
      }
    } else {
      cols.push({
        header: `${comp.name} (Max: ${comp.maxMarks}, Wt: ${comp.weight}%)`,
        key: comp.id,
        componentId: comp.id,
        maxMarks: Number(comp.maxMarks),
      });
    }
  }
  return cols;
}

// ─── Download Template ────────────────────────────────────────────────────────

/**
 * Generate and download an Excel marks-entry template file.
 * Columns: #, Student Name, Admission No, [one column per assessment component].
 * Pre-fills existing marks if provided.
 *
 * @param template        The assessment template
 * @param students        List of students
 * @param existingMarks   Optional map of studentId → componentId → value(s)
 * @param filename        Output filename (without extension)
 */
export function downloadMarksTemplate(
  template: GradebookTemplate,
  students: GradebookStudent[],
  existingMarks?: Record<string, Record<string, number | "" | (number | "")[]>>,
  filename = "marks-entry-template"
) {
  const cols = buildColumnDefs(template.components);

  // ── Build header row ──────────────────────────────────────────────────────
  const headerRow = [
    "#",
    "Student Name",
    "Admission No",
    "__student_id__", // Hidden column used during import to reliably map rows
    ...cols.map((c) => c.header),
  ];

  // ── Build data rows ───────────────────────────────────────────────────────
  const dataRows = students.map((student, idx) => {
    const name = `${student.user.firstName} ${student.user.lastName}`;
    const baseRow: (string | number)[] = [
      idx + 1,
      name,
      student.admissionNumber ?? "",
      student.id, // Hidden ID
    ];

    for (const col of cols) {
      let value: number | "" = "";
      const studentMarks = existingMarks?.[student.id];

      if (studentMarks) {
        const raw = studentMarks[col.componentId];
        if (typeof col.repeatIndex === "number") {
          const arr = Array.isArray(raw) ? raw : [];
          value = arr[col.repeatIndex] ?? "";
        } else {
          value = typeof raw === "number" ? raw : "";
        }
      }
      baseRow.push(value);
    }

    return baseRow;
  });

  // ── Assemble worksheet ────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);

  // Column widths
  ws["!cols"] = [
    { wch: 5 },  // #
    { wch: 28 }, // Student Name
    { wch: 18 }, // Admission No
    { wch: 0 },  // Hidden ID (width 0 effectively hides it visually)
    ...cols.map(() => ({ wch: 22 })),
  ];

  // Freeze top row (header)
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };

  // Style the header row bold + coloured background
  const range = XLSX.utils.decode_range(ws["!ref"]!);
  for (let C = range.s.c; C <= range.e.c; C++) {
    const cellAddr = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[cellAddr]) continue;
    ws[cellAddr].s = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1E40AF" } },
      alignment: { horizontal: "center" },
    };
  }



  // Metadata sheet for the import to validate template compatibility
  const metaWs = XLSX.utils.aoa_to_sheet([
    ["template_id", template.id],
    ["template_name", template.name],
    ["generated_at", new Date().toISOString()],
    ["column_keys", cols.map((c) => c.key).join("|")],
    ["component_ids", cols.map((c) => c.componentId).join("|")],
    ["repeat_indices", cols.map((c) => c.repeatIndex ?? "").join("|")],
    ["max_marks", cols.map((c) => c.maxMarks).join("|")],
  ]);

  XLSX.utils.book_append_sheet(wb, ws, "Marks Entry");
  XLSX.utils.book_append_sheet(wb, metaWs, "__meta__");

  XLSX.writeFile(wb, `${filename}.xlsx`, { bookType: "xlsx" });
}

// ─── Parse Upload ─────────────────────────────────────────────────────────────

export interface ParsedStudentMarks {
  studentId: string;
  marks: Record<string, number | "" | (number | "")[]>;
  /** Any validation warnings for this row */
  warnings: string[];
}

export interface ParseResult {
  success: boolean;
  error?: string;
  templateId?: string;
  students: ParsedStudentMarks[];
  /** Global warnings (non-fatal) */
  warnings: string[];
}

/**
 * Parse an uploaded Excel marks file.
 * Validates that the file matches the current template before extracting data.
 *
 * @param file      The File object from the file input
 * @param template  The currently active assessment template (for cross-checking)
 */
export async function parseMarksExcel(
  file: File,
  template: GradebookTemplate
): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array", cellStyles: true });

  // ── Validate __meta__ sheet ───────────────────────────────────────────────
  const metaSheet = wb.Sheets["__meta__"];
  if (!metaSheet) {
    return {
      success: false,
      error:
        "Invalid file: This does not appear to be a marks template generated by this system. Please download a fresh template.",
      students: [],
      warnings: [],
    };
  }

  const metaData = XLSX.utils.sheet_to_json<[string, string]>(metaSheet, {
    header: 1,
  }) as [string, string][];
  const meta: Record<string, string> = {};
  for (const [key, value] of metaData) {
    if (key) meta[key] = String(value ?? "");
  }

  if (meta["template_id"] !== template.id) {
    return {
      success: false,
      error: `Template mismatch: This file was generated for a different assessment template ("${meta["template_name"] ?? "Unknown"}"). Please download a fresh template for "${template.name}".`,
      students: [],
      warnings: [],
    };
  }

  // ── Parse column keys from meta ───────────────────────────────────────────
  const colKeys = meta["column_keys"]?.split("|") ?? [];
  const componentIds = meta["component_ids"]?.split("|") ?? [];
  const repeatIndicesRaw = meta["repeat_indices"]?.split("|") ?? [];
  const maxMarksRaw = meta["max_marks"]?.split("|") ?? [];

  const globalWarnings: string[] = [];

  // ── Parse Marks Entry sheet ───────────────────────────────────────────────
  const marksSheet = wb.Sheets["Marks Entry"];
  if (!marksSheet) {
    return {
      success: false,
      error: "Could not find the 'Marks Entry' sheet in the uploaded file.",
      students: [],
      warnings: [],
    };
  }

  const rows = (
    XLSX.utils.sheet_to_json(marksSheet, {
      header: 1,
      defval: "",
    }) as unknown
  ) as unknown[][];

  if (rows.length < 2) {
    return {
      success: false,
      error: "The uploaded file has no student data rows.",
      students: [],
      warnings: [],
    };
  }

  // Row 0 is header, skip it
  const parsedStudents: ParsedStudentMarks[] = [];

  for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx] as (string | number)[];
    const studentId = String(row[3] ?? "").trim();

    if (!studentId) continue; // Skip blank rows

    const warnings: string[] = [];
    // Build a temporary accumulator for repeatable components
    const marksAccumulator: Record<string, number | "" | (number | "")[]> = {};

    for (let colIdx = 0; colIdx < colKeys.length; colIdx++) {
      const rawValue = row[4 + colIdx]; // +4 offset: #, Name, AdmNo, StudentId
      const componentId = componentIds[colIdx];
      const repeatIndexStr = repeatIndicesRaw[colIdx];
      const maxMark = Number(maxMarksRaw[colIdx]);
      const hasRepeat = repeatIndexStr !== "" && repeatIndexStr !== undefined;
      const repeatIndex = hasRepeat ? parseInt(repeatIndexStr, 10) : undefined;

      let parsedValue: number | "" = "";

      if (rawValue !== "" && rawValue !== null && rawValue !== undefined) {
        const num = Number(rawValue);
        if (isNaN(num)) {
          warnings.push(
            `Row ${rowIdx + 1}: Non-numeric value "${rawValue}" in column "${colKeys[colIdx]}" — skipped.`
          );
        } else if (num < 0 || num > maxMark) {
          warnings.push(
            `Row ${rowIdx + 1}: Mark ${num} for "${colKeys[colIdx]}" is out of range (0–${maxMark}) — skipped.`
          );
        } else {
          parsedValue = num;
        }
      }

      if (typeof repeatIndex === "number") {
        // Repeatable component — store in array
        if (!Array.isArray(marksAccumulator[componentId])) {
          const comp = template.components.find((c) => c.id === componentId);
          const expectedCount = comp?.expectedCount ?? 1;
          marksAccumulator[componentId] = Array(expectedCount).fill("");
        }
        (marksAccumulator[componentId] as (number | "")[])[repeatIndex] =
          parsedValue;
      } else {
        marksAccumulator[componentId] = parsedValue;
      }
    }

    parsedStudents.push({
      studentId,
      marks: marksAccumulator,
      warnings,
    });
  }

  if (parsedStudents.length === 0) {
    return {
      success: false,
      error: "No valid student rows were found in the uploaded file.",
      students: [],
      warnings: globalWarnings,
    };
  }

  return {
    success: true,
    templateId: template.id,
    students: parsedStudents,
    warnings: globalWarnings,
  };
}
