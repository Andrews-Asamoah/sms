"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Loader2, Upload, Trash2, PenLine, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updateSignature, deleteSignature } from "@/actions/signature";

interface SignatureEditorProps {
  currentSignatureUrl?: string;
}

export function SignatureEditor({ currentSignatureUrl }: SignatureEditorProps) {
  const [signatureUrl, setSignatureUrl] = useState<string | undefined>(
    currentSignatureUrl,
  );
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!file) return;

      // Client-side validation
      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Only JPEG, PNG, and WebP images are allowed.");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error("File must be under 2 MB.");
        return;
      }

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("signature", file);
        const result = await updateSignature(formData);

        if (result.success && result.signatureUrl) {
          setSignatureUrl(result.signatureUrl);
          toast.success("Signature uploaded successfully!");
        } else {
          toast.error(result.error || "Failed to upload signature.");
        }
      } catch {
        toast.error("An unexpected error occurred.");
      } finally {
        setUploading(false);
      }
    },
    [],
  );

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const result = await deleteSignature();
      if (result.success) {
        setSignatureUrl(undefined);
        toast.success("Signature removed.");
      } else {
        toast.error(result.error || "Failed to remove signature.");
      }
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setDeleting(false);
    }
  };

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [handleUpload],
  );

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  return (
    <div className="space-y-6">
      {/* Current Signature Preview */}
      {signatureUrl ? (
        <div className="space-y-4">
          <div className="relative group">
            <div className="border-2 border-dashed border-emerald-300 dark:border-emerald-700 rounded-2xl p-6 bg-white dark:bg-slate-950 flex items-center justify-center min-h-[140px] transition-all">
              <img
                src={signatureUrl}
                alt="Your digital signature"
                className="max-h-[100px] max-w-full object-contain"
              />
            </div>
            <div className="absolute top-3 right-3 flex items-center gap-1 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-semibold">
              <CheckCircle2 className="h-3 w-3" />
              Active
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading || deleting}
              className="flex-1 gap-2 rounded-xl h-11 border-black/10 dark:border-white/10 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Replace Signature
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={handleDelete}
              disabled={uploading || deleting}
              className="gap-2 rounded-xl h-11 border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Remove
            </Button>
          </div>
        </div>
      ) : (
        /* Drop Zone */
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => !uploading && inputRef.current?.click()}
          className={cn(
            "relative cursor-pointer border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-4 min-h-[180px] transition-all duration-300",
            isDragOver
              ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 scale-[1.01]"
              : "border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/30 dark:hover:bg-blue-950/10",
            uploading && "pointer-events-none opacity-60",
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
              <p className="text-sm font-medium text-slate-500">
                Uploading signature…
              </p>
            </>
          ) : (
            <>
              <div className="p-4 rounded-2xl bg-blue-100/60 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-transform group-hover:scale-110">
                <PenLine className="h-8 w-8" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Upload your digital signature
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Drag & drop or click to browse • JPEG, PNG, WebP • Max 2 MB
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          e.target.value = "";
        }}
      />

      {/* Info Box */}
      <div className="rounded-xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-800/30 p-4">
        <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
          <strong>📝 Tip:</strong> Your digital signature will appear on
          official school documents such as report cards. For best results, use a
          transparent PNG with a clear, dark signature on a white or transparent
          background.
        </p>
      </div>
    </div>
  );
}
