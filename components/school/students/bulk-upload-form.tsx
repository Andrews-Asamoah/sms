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
  classes: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string }>;
  houses: Array<{ id: string; name: string }>;
}

interface UploadResult {
  row: number;
  studentId: string;
  name: string;
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
      // Validate file type
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
      ];

      if (!validTypes.includes(selectedFile.type)) {
        toast.error("Invalid file type", {
          description: "Please upload an Excel file (.xlsx or .xls)",
        });
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
      const formData = new FormData();
      formData.append("file", file);
      formData.append("schoolId", schoolId);

      const response = await fetch(
        `/api/schools/${schoolSlug}/students/bulk-upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload students");
      }

      const data = await response.json();
      setResults(data.results);
      setShowResults(true);
      setUploadProgress(100);

      const successCount = data.results.filter(
        (r: UploadResult) => r.status === "success"
      ).length;
      const errorCount = data.results.filter(
        (r: UploadResult) => r.status === "error"
      ).length;

      toast.success("Upload completed", {
        description: `${successCount} students uploaded successfully. ${errorCount} errors.`,
      });

      if (errorCount === 0) {
        setTimeout(() => {
          router.push(`/${schoolSlug}/admin/students`);
          router.refresh();
        }, 2000);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Upload failed", {
        description:
          error instanceof Error ? error.message : "Please try again later.",
      });
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
          <FieldLabel htmlFor="file">Select Excel File</FieldLabel>
          <div className="flex gap-4">
            <Input
              id="file"
              type="file"
              accept=".xlsx,.xls"
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
              <FileSpreadsheet className="h-4 w-4" />
              <span>{file.name}</span>
              <span className="text-xs">
                ({(file.size / 1024).toFixed(2)} KB)
              </span>
            </div>
          )}
        </FieldGroup>

        {isUploading && (
          <div className="space-y-2">
            <Progress value={uploadProgress} className="w-full" />
            <p className="text-sm text-muted-foreground text-center">
              Processing students data...
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
                className="bg-green-500/10 text-green-700"
              >
                <CheckCircle className="mr-1 h-3 w-3" />
                {successCount} Successful
              </Badge>
              <Badge variant="outline" className="bg-red-500/10 text-red-700">
                <XCircle className="mr-1 h-3 w-3" />
                {errorCount} Errors
              </Badge>
            </div>
          </div>

          <div className="rounded-md border max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Row</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result, index) => (
                  <TableRow key={index}>
                    <TableCell>{result.row}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {result.studentId}
                    </TableCell>
                    <TableCell>{result.name}</TableCell>
                    <TableCell>
                      {result.status === "success" ? (
                        <Badge
                          variant="outline"
                          className="bg-green-500/10 text-green-700"
                        >
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Success
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-red-500/10 text-red-700"
                        >
                          <XCircle className="mr-1 h-3 w-3" />
                          Error
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {result.message || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {errorCount === 0 && (
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  router.push(`/${schoolSlug}/admin/students`);
                  router.refresh();
                }}
              >
                View All Students
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
