// components/school/students/bulk-upload-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  SkipForward,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldGroup, FieldLabel } from "@/components/ui/field";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// ============================================================================
// TYPES
// ============================================================================

interface BulkUploadFormProps {
  schoolId: string;
  schoolSlug: string;
  schoolCode: string;
  classes: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string }>;
  houses: Array<{ id: string; name: string }>;
}

interface UploadResult {
  row: number;
  studentId: string;
  admissionNumber: string;
  name: string;
  email?: string;
  password?: string;
  status: "success" | "error";
  action?: "created" | "updated" | "skipped";
  message?: string;
}

interface UploadSummary {
  total: number;
  successful: number;
  repaired: number;
  skipped: number;
  failed: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BulkUploadForm({ schoolSlug }: BulkUploadFormProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [summary, setSummary] = useState<UploadSummary | null>(null);
  const [showResults, setShowResults] = useState(false);

  // ── File validation ────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const extension = selectedFile.name.split(".").pop()?.toLowerCase();
    const validExtensions = ["xlsx", "xls"];
    const validMimeTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];

    if (
      !validExtensions.includes(extension ?? "") &&
      !validMimeTypes.includes(selectedFile.type)
    ) {
      toast.error("Invalid file type", {
        description: "Please upload an Excel file (.xlsx or .xls) only.",
      });
      e.target.value = "";
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("File too large", {
        description: "File size must be less than 10MB.",
      });
      e.target.value = "";
      return;
    }

    setFile(selectedFile);
    setResults([]);
    setSummary(null);
    setShowResults(false);
  };

  // ── Upload handler ─────────────────────────────────────────────────────────
  //
  // The file is sent as multipart/form-data — the server parses the Excel
  // file. This keeps xlsx out of the client bundle (~500KB saved) and
  // ensures ALL rows are processed in a single request so the server's
  // Phase A ID reservation is never split across multiple calls (which
  // would cause duplicate student ID collisions).
  //
  const handleUpload = async () => {
    if (!file) {
      toast.error("No file selected", {
        description: "Please select an Excel file to upload.",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    setResults([]);
    setSummary(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Simulate progress while waiting for the server (upload + processing).
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 5, 85));
      }, 800);

      const response = await fetch(
        `/api/schools/${schoolSlug}/students/bulk-upload`,
        {
          method: "POST",
          // Do NOT set Content-Type manually — the browser sets it automatically
          // with the correct multipart boundary when using FormData.
          body: formData,
        },
      );

      clearInterval(progressInterval);
      setUploadProgress(95);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setResults(data.results ?? []);
      setSummary(data.summary ?? null);
      setShowResults(true);
      setUploadProgress(100);

      const s: UploadSummary = data.summary;

      if (s.failed === 0 && s.successful > 0) {
        toast.success(
          `Upload complete — ${s.successful} created${s.repaired ? `, ${s.repaired} repaired` : ""}${s.skipped ? `, ${s.skipped} skipped` : ""}.`,
        );
        setTimeout(() => {
          router.push(`/${schoolSlug}/admin/students`);
          router.refresh();
        }, 2500);
      } else if (s.failed === 0 && s.skipped > 0 && s.successful === 0) {
        toast.info(`All ${s.skipped} students already exist — nothing to do.`);
      } else if (s.successful > 0 && s.failed > 0) {
        toast.warning("Upload completed with errors", {
          description: `${s.successful} created, ${s.failed} failed. Review errors below.`,
        });
      } else if (s.failed > 0 && s.successful === 0) {
        toast.error("Upload failed", {
          description: `All ${s.failed} rows failed. Review errors below.`,
        });
      }
    } catch (error) {
      console.error("[BulkUploadForm] Error:", error);
      toast.error("Upload failed", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  // ── Reset ──────────────────────────────────────────────────────────────────

  const handleReset = () => {
    setFile(null);
    setResults([]);
    setSummary(null);
    setShowResults(false);
    setUploadProgress(0);
    const fileInput = document.getElementById("file") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* File input + upload button */}
      <div className="space-y-4">
        <FieldGroup>
          <FieldLabel htmlFor="file">
            Select Excel File (.xlsx or .xls only)
          </FieldLabel>
          <div className="flex gap-4">
            <Input
              id="file"
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={handleFileChange}
              disabled={isUploading}
              className="flex-1"
            />
            <Button
              onClick={handleUpload}
              disabled={!file || isUploading}
              size="lg"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-5 w-5" />
                  Upload Students
                </>
              )}
            </Button>
          </div>

          {file && !isUploading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              <span className="font-medium">{file.name}</span>
              <span className="text-xs">
                ({(file.size / 1024).toFixed(1)} KB)
              </span>
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-1">
            Maximum file size: 10MB · Supported formats: .xlsx, .xls
          </p>
        </FieldGroup>

        {isUploading && (
          <div className="space-y-2">
            <Progress value={uploadProgress} className="w-full" />
            <p className="text-sm text-muted-foreground text-center">
              Processing students — IDs and admission numbers are being
              auto-generated…
            </p>
          </div>
        )}
      </div>

      {/* Results */}
      {showResults && results.length > 0 && summary && (
        <div className="space-y-4">
          {/* Summary badges */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-lg font-semibold">Upload Results</h3>
            <div className="flex flex-wrap gap-2">
              {summary.successful > 0 && (
                <Badge
                  variant="outline"
                  className="bg-green-500/10 text-green-700 border-green-300"
                >
                  <CheckCircle className="mr-1 h-3 w-3" />
                  {summary.successful} Created
                </Badge>
              )}
              {summary.repaired > 0 && (
                <Badge
                  variant="outline"
                  className="bg-blue-500/10 text-blue-700 border-blue-300"
                >
                  <Wrench className="mr-1 h-3 w-3" />
                  {summary.repaired} Repaired
                </Badge>
              )}
              {summary.skipped > 0 && (
                <Badge
                  variant="outline"
                  className="bg-yellow-500/10 text-yellow-700 border-yellow-300"
                >
                  <SkipForward className="mr-1 h-3 w-3" />
                  {summary.skipped} Skipped
                </Badge>
              )}
              {summary.failed > 0 && (
                <Badge
                  variant="outline"
                  className="bg-red-500/10 text-red-700 border-red-300"
                >
                  <XCircle className="mr-1 h-3 w-3" />
                  {summary.failed} Failed
                </Badge>
              )}
            </div>
          </div>

          {/* Error guidance */}
          {summary.failed > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold">Some rows failed to upload</p>
                <p className="mt-1">
                  Review the errors below, correct the data in your Excel file,
                  and re-upload. Successfully created students will be detected
                  as duplicates and skipped automatically.
                </p>
              </div>
            </div>
          )}

          {/* Results table */}
          <div className="rounded-md border max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Row</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Admission No.</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Login Credentials</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result, index) => (
                  <TableRow
                    key={index}
                    className={
                      result.status === "error"
                        ? "bg-red-50/50 dark:bg-red-950/20"
                        : result.action === "skipped"
                          ? "opacity-60"
                          : ""
                    }
                  >
                    <TableCell className="font-medium tabular-nums">
                      {result.row}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {result.studentId || "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {result.admissionNumber || "—"}
                    </TableCell>
                    <TableCell className="font-medium">{result.name}</TableCell>
                    <TableCell>
                      {result.status === "success" &&
                      result.password &&
                      result.action !== "skipped" ? (
                        <div className="flex flex-col gap-0.5 text-xs">
                          <span className="font-mono text-muted-foreground">
                            {result.email}
                          </span>
                          <span className="font-mono font-semibold">
                            {result.password}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <ActionBadge result={result} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-48 truncate">
                      {result.message ||
                        (result.action === "created"
                          ? "Successfully created"
                          : null)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Footer actions */}
          <div className="flex justify-end gap-3">
            {summary.failed === 0 ? (
              <Button
                onClick={() => {
                  router.push(`/${schoolSlug}/admin/students`);
                  router.refresh();
                }}
              >
                View All Students
              </Button>
            ) : (
              <Button variant="outline" onClick={handleReset}>
                Upload Again
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-component: action badge ────────────────────────────────────────────

function ActionBadge({ result }: { result: UploadResult }) {
  if (result.status === "error") {
    return (
      <Badge
        variant="outline"
        className="bg-red-500/10 text-red-700 border-red-300"
      >
        <XCircle className="mr-1 h-3 w-3" />
        Error
      </Badge>
    );
  }

  switch (result.action) {
    case "created":
      return (
        <Badge
          variant="outline"
          className="bg-green-500/10 text-green-700 border-green-300"
        >
          <CheckCircle className="mr-1 h-3 w-3" />
          Created
        </Badge>
      );
    case "updated":
      return (
        <Badge
          variant="outline"
          className="bg-blue-500/10 text-blue-700 border-blue-300"
        >
          <Wrench className="mr-1 h-3 w-3" />
          Repaired
        </Badge>
      );
    case "skipped":
      return (
        <Badge
          variant="outline"
          className="bg-yellow-500/10 text-yellow-700 border-yellow-300"
        >
          <SkipForward className="mr-1 h-3 w-3" />
          Skipped
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          <CheckCircle className="mr-1 h-3 w-3" />
          Success
        </Badge>
      );
  }
}
