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
  message?: string;
}

export function BulkUploadForm({ schoolId, schoolSlug }: BulkUploadFormProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type - EXCEL ONLY
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
        "application/vnd.ms-excel", // .xls
      ];

      const fileExtension = selectedFile.name.split(".").pop()?.toLowerCase();
      const isValidExtension =
        fileExtension === "xlsx" || fileExtension === "xls";

      if (!validTypes.includes(selectedFile.type) && !isValidExtension) {
        toast.error("Invalid file type", {
          description:
            "Please upload an Excel file (.xlsx or .xls) only. Other formats are not supported.",
        });
        e.target.value = ""; // Clear the input
        return;
      }

      // Check file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (selectedFile.size > maxSize) {
        toast.error("File too large", {
          description: "File size must be less than 10MB",
        });
        e.target.value = "";
        return;
      }

      setFile(selectedFile);
      setResults([]);
      setShowResults(false);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("No file selected", {
        description: "Please select an Excel file to upload",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setResults([]);

    try {
      const { read, utils } = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      const rawRows = utils.sheet_to_json(sheet, { raw: false }) as Record<string, unknown>[];
      
      if (rawRows.length === 0) {
        throw new Error("No data found in the Excel file");
      }

      const getVal = (row: Record<string, any>, ...keys: string[]) => {
        for (const key of keys) {
          if (row[key] !== undefined) return row[key];
          const normalizedReq = key.toLowerCase().replace(/[^a-z0-9]/g, "");
          const actualKey = Object.keys(row).find((k) => {
            const normalizedActual = k.toLowerCase().replace(/[^a-z0-9]/g, "");
            return normalizedActual === normalizedReq;
          });
          if (actualKey) return row[actualKey];
        }
        return undefined;
      };

      const studentsData = rawRows.map((row) => ({
        firstName: String(getVal(row, "First Name*", "First Name", "FirstName") || "").trim(),
        lastName: String(getVal(row, "Last Name*", "Last Name", "LastName") || "").trim(),
        otherNames: getVal(row, "Other Names") ? String(getVal(row, "Other Names")).trim() : null,
        gender: String(getVal(row, "Gender*", "Gender") || "").toUpperCase(),
        dateOfBirth: String(getVal(row, "Date of Birth*", "Date of Birth", "DOB") || ""),
        nationality: getVal(row, "Nationality") ? String(getVal(row, "Nationality")).trim() : null,
        phone: getVal(row, "Phone") ? String(getVal(row, "Phone")).trim() : null,
        alternatePhone: getVal(row, "Alternate Phone") ? String(getVal(row, "Alternate Phone")).trim() : null,
        residentialAddress: getVal(row, "Residential Address") ? String(getVal(row, "Residential Address")).trim() : null,
        postalAddress: getVal(row, "Postal Address") ? String(getVal(row, "Postal Address")).trim() : null,
        city: getVal(row, "City") ? String(getVal(row, "City")).trim() : null,
        region: getVal(row, "Region") ? String(getVal(row, "Region")).trim() : null,
        country: getVal(row, "Country") ? String(getVal(row, "Country")).trim() : null,
        admissionDate: String(getVal(row, "Admission Date*", "Admission Date") || ""),
        className: getVal(row, "Class Name", "Class") ? String(getVal(row, "Class Name", "Class")).trim() : null,
        departmentName: getVal(row, "Department Name", "Department") ? String(getVal(row, "Department Name", "Department")).trim() : null,
        houseName: getVal(row, "House Name", "House") ? String(getVal(row, "House Name", "House")).trim() : null,
        previousSchool: getVal(row, "Previous School") ? String(getVal(row, "Previous School")).trim() : null,
        previousClass: getVal(row, "Previous Class") ? String(getVal(row, "Previous Class")).trim() : null,
        bloodGroup: getVal(row, "Blood Group") ? String(getVal(row, "Blood Group")).trim() : null,
        allergies: getVal(row, "Allergies") ? String(getVal(row, "Allergies")).trim() : null,
        medicalConditions: getVal(row, "Medical Conditions") ? String(getVal(row, "Medical Conditions")).trim() : null,
        emergencyContactName: getVal(row, "Emergency Contact Name") ? String(getVal(row, "Emergency Contact Name")).trim() : null,
        emergencyContactPhone: getVal(row, "Emergency Contact Phone") ? String(getVal(row, "Emergency Contact Phone")).trim() : null,
        emergencyRelationship: getVal(row, "Emergency Relationship") ? String(getVal(row, "Emergency Relationship")).trim() : null,
      }));

      const BATCH_SIZE = 20;
      const allResults: UploadResult[] = [];
      
      for (let i = 0; i < studentsData.length; i += BATCH_SIZE) {
        const batch = studentsData.slice(i, i + BATCH_SIZE);
        const progress = Math.round((i / studentsData.length) * 100);
        setUploadProgress(progress);

        const response = await fetch(
          `/api/schools/${schoolSlug}/students/bulk-upload`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ students: batch, schoolId }),
          },
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || `Failed to upload batch starting at row ${i + 2}`);
        }

        const data = await response.json();
        allResults.push(...data.results);
      }

      setResults(allResults);
      setShowResults(true);
      setUploadProgress(100);

      const successCount = allResults.filter(
        (r: UploadResult) => r.status === "success",
      ).length;
      const errorCount = allResults.filter(
        (r: UploadResult) => r.status === "error",
      ).length;

      if (successCount > 0 && errorCount === 0) {
        toast.success(`Successfully processed ${successCount} students.`);
        setTimeout(() => {
          router.push(`/${schoolSlug}/admin/students`);
          router.refresh();
        }, 2000);
      } else if (successCount > 0 && errorCount > 0) {
        toast.warning("Upload completed with errors", {
          description: `${successCount} students uploaded, ${errorCount} failed.`,
        });
      } else {
        toast.error("Upload failed", {
          description: `All ${errorCount} students failed to upload.`,
        });
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Upload failed", {
        description:
          error instanceof Error ? error.message : "Please try again later.",
      });
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const successCount = results.filter((r) => r.status === "success").length;
  const errorCount = results.filter((r) => r.status === "error").length;

  return (
    <div className="space-y-6">
      {/* File Upload */}
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
                  Uploading...
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
                ({(file.size / 1024).toFixed(2)} KB)
              </span>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Maximum file size: 10MB • Supported formats: .xlsx, .xls
          </p>
        </FieldGroup>

        {isUploading && (
          <div className="space-y-2">
            <Progress value={uploadProgress} className="w-full" />
            <p className="text-sm text-muted-foreground text-center">
              Processing students data... Student IDs and admission numbers are
              being auto-generated.
            </p>
          </div>
        )}
      </div>

      {/* Results */}
      {showResults && results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Upload Results</h3>
            <div className="flex gap-4">
              <Badge
                variant="outline"
                className="bg-green-500/10 text-green-700 border-green-300"
              >
                <CheckCircle className="mr-1 h-3 w-3" />
                {successCount} Successful
              </Badge>
              {errorCount > 0 && (
                <Badge
                  variant="outline"
                  className="bg-red-500/10 text-red-700 border-red-300"
                >
                  <XCircle className="mr-1 h-3 w-3" />
                  {errorCount} Errors
                </Badge>
              )}
            </div>
          </div>

          {errorCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold">Some students failed to upload</p>
                <p className="mt-1">
                  Review the errors below, correct the data in your Excel file,
                  and try uploading again.
                </p>
              </div>
            </div>
          )}

          <div className="rounded-md border max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Row</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Admission No.</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Credentials</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result, index) => (
                  <TableRow
                    key={index}
                    className={result.status === "error" ? "bg-red-50/50" : ""}
                  >
                    <TableCell className="font-medium">{result.row}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {result.studentId || "-"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {result.admissionNumber || "-"}
                    </TableCell>
                    <TableCell className="font-medium">{result.name}</TableCell>
                    <TableCell>
                      {result.status === "success" && result.password ? (
                        <div className="flex flex-col space-y-1 text-xs">
                          <span className="font-mono text-muted-foreground">
                            {result.email}
                          </span>
                          <span className="font-mono font-medium">
                            {result.password}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {result.status === "success" ? (
                        <Badge
                          variant="outline"
                          className="bg-green-500/10 text-green-700 border-green-300"
                        >
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Success
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-red-500/10 text-red-700 border-red-300"
                        >
                          <XCircle className="mr-1 h-3 w-3" />
                          Error
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {result.message || "Successfully created"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end gap-3">
            {errorCount === 0 && (
              <Button
                onClick={() => {
                  router.push(`/${schoolSlug}/admin/students`);
                  router.refresh();
                }}
              >
                View All Students
              </Button>
            )}
            {errorCount > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  setFile(null);
                  setResults([]);
                  setShowResults(false);
                  const fileInput = document.getElementById(
                    "file",
                  ) as HTMLInputElement;
                  if (fileInput) fileInput.value = "";
                }}
              >
                Upload Again
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
