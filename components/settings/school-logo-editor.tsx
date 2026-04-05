// components/settings/school-logo-editor.tsx
"use client";

import { useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { updateSchoolLogo, deleteSchoolLogo } from "@/actions/school-logo";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SchoolLogoEditorProps {
  schoolId: string;
  currentLogo?: string | null;
  schoolName: string;
}

export function SchoolLogoEditor({
  schoolId,
  currentLogo,
  schoolName,
}: SchoolLogoEditorProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [displayLogo, setDisplayLogo] = useState<string | null | undefined>(
    currentLogo,
  );
  const [cacheBuster, setCacheBuster] = useState<number>(() => Date.now());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Append a timestamp so the browser bypasses its cache after each upload.
  // The R2 key is always the same URL, so without this the old image persists.
  const logoSrc = displayLogo ? `${displayLogo}?t=${cacheBuster}` : "";

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("logo", file);

    try {
      const result = await updateSchoolLogo(schoolId, formData);
      if (result.success) {
        toast.success("School logo updated successfully");
        if (result.logoUrl) {
          setDisplayLogo(result.logoUrl);
          // Force browser to bypass cache — the R2 key is stable so the URL
          // never changes; without this the stale image is shown indefinitely.
          setCacheBuster(Date.now());
        }
        // Reset file input so the same file can be re-selected if needed
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        toast.error(result.error || "Failed to update logo");
      }
    } catch (error) {
      toast.error("An error occurred while uploading the logo");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRemoveLogo() {
    setIsDeleting(true);
    try {
      const result = await deleteSchoolLogo(schoolId);
      if (result.success) {
        toast.success("School logo removed successfully");
        setDisplayLogo(null);
      } else {
        toast.error(result.error || "Failed to remove logo");
      }
    } catch (error) {
      toast.error("An error occurred while removing the logo");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-5 p-5 bg-card border rounded-xl shadow-sm">
      <div className="relative group">
        <Avatar className="h-28 w-28 border-4 border-background shadow-md">
          <AvatarImage
            src={logoSrc}
            alt={schoolName}
            className="object-contain p-1.5"
          />
          <AvatarFallback className="text-3xl font-bold bg-primary/10 text-primary">
            {schoolName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition-all">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-2.5 text-center">
        <div>
          <h3 className="text-base font-semibold">School Logo</h3>
          <p className="text-xs text-muted-foreground max-w-[200px] mx-auto mt-1">
            Preferred format: PNG or SVG with transparent background.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            className="relative overflow-hidden cursor-pointer"
            disabled={isUploading || isDeleting}
            asChild
          >
            <label>
              <Upload className="mr-2 h-4 w-4" />
              {displayLogo ? "Change Logo" : "Upload Logo"}
              <input
                ref={fileInputRef}
                type="file"
                className="sr-only"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={isUploading || isDeleting}
              />
            </label>
          </Button>

          {displayLogo && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isUploading || isDeleting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove School Logo?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to remove the school logo? This action
                    cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleRemoveLogo}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      "Remove Logo"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </div>
  );
}
