// components/school/students/bulk-image-upload.tsx
"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, CheckCircle2, AlertCircle, FileImage, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface UploadResult {
  filename: string;
  status: "ok" | "not_found" | "invalid" | "error";
  studentId?: string;
  reason?: string;
}

interface BulkImageUploadProps {
  schoolSlug: string;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Bulk Student Image Uploader
 *
 * Drop or select multiple images named after the student's studentId or
 * admissionNumber (e.g. "STU-26-0001.jpg", "260001.png").
 * The server matches, optimises, and stores each image in R2.
 */
export function BulkImageUpload({ schoolSlug }: BulkImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<UploadResult[] | null>(null);

  // ── File validation ────────────────────────────────────────────────────────
  function validateAndAdd(incoming: FileList | File[]) {
    const valid: File[] = [];
    const rejected: string[] = [];

    for (const file of Array.from(incoming)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        rejected.push(`${file.name} (unsupported type)`);
      } else if (file.size > MAX_FILE_SIZE) {
        rejected.push(`${file.name} (exceeds 2 MB)`);
      } else {
        valid.push(file);
      }
    }

    if (rejected.length) {
      toast.warning(`${rejected.length} file(s) skipped`, {
        description: rejected.slice(0, 3).join(", "),
      });
    }

    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      return [...prev, ...valid.filter((f) => !names.has(f.name))];
    });
    setResults(null);
  }

  // ── Drag-and-drop handlers ─────────────────────────────────────────────────
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setIsDragging(false), []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    validateAndAdd(e.dataTransfer.files);
  }, []);

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name));
    setResults(null);
  }

  // ── Upload ─────────────────────────────────────────────────────────────────
  async function handleUpload() {
    if (!files.length) return;
    setIsUploading(true);
    setProgress(10);

    const formData = new FormData();
    files.forEach((file) => formData.append(file.name, file));

    try {
      // Simulate incremental progress while waiting
      const ticker = setInterval(() => {
        setProgress((p) => Math.min(p + 5, 85));
      }, 300);

      const res = await fetch(
        `/api/schools/${schoolSlug}/students/bulk-image-upload`,
        { method: "POST", body: formData },
      );

      clearInterval(ticker);
      setProgress(100);

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setResults(data.results);

      const { summary } = data;
      toast.success(
        `${summary.matched} / ${summary.total} photos uploaded`,
        {
          description: summary.notFound
            ? `${summary.notFound} file(s) didn't match any student.`
            : undefined,
        },
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  function reset() {
    setFiles([]);
    setResults(null);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/40",
        )}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm font-medium">
          Drag &amp; drop images here, or click to browse
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Name each file after the student&apos;s{" "}
          <strong>Student ID</strong> or <strong>Admission Number</strong>
          {" "}(e.g. <code className="font-mono">STU-26-0001.jpg</code>).
          JPEG, PNG or WebP · max 2 MB each.
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => e.target.files && validateAndAdd(e.target.files)}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{files.length} file(s) selected</p>
            <Button type="button" variant="ghost" size="sm" onClick={reset} disabled={isUploading}>
              <X className="h-4 w-4 mr-1" />
              Clear all
            </Button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border p-2">
            {files.map((file) => {
              const result = results?.find((r) => r.filename === file.name);
              return (
                <div
                  key={file.name}
                  className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted/50 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileImage className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <span className="truncate font-mono text-xs">{file.name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {result && (
                      result.status === "ok" ? (
                        <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Uploaded
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-destructive border-destructive/30" title={result.reason}>
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {result.status === "not_found" ? "No match" : result.status}
                        </Badge>
                      )
                    )}
                    {!result && !isUploading && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeFile(file.name); }}
                        className="h-5 w-5 rounded-full flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Progress */}
      {isUploading && (
        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            Optimising and uploading…
          </p>
        </div>
      )}

      {/* Actions */}
      {files.length > 0 && !results && (
        <Button
          type="button"
          onClick={handleUpload}
          disabled={isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading {files.length} image(s)…
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload {files.length} image(s)
            </>
          )}
        </Button>
      )}

      {results && (
        <Button type="button" variant="outline" onClick={reset} className="w-full">
          Upload more images
        </Button>
      )}
    </div>
  );
}
