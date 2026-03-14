// components/settings/school-logo-editor.tsx
"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { updateSchoolLogo, deleteSchoolLogo } from "@/actions/school-logo";

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
    if (!confirm("Are you sure you want to remove the school logo?")) return;

    setIsDeleting(true);
    try {
      const result = await deleteSchoolLogo(schoolId);
      if (result.success) {
        toast.success("School logo removed successfully");
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
          <AvatarImage src={currentLogo || ""} alt={schoolName} className="object-contain p-1.5" />
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
              {currentLogo ? "Change Logo" : "Upload Logo"}
              <input
                type="file"
                className="sr-only"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={isUploading || isDeleting}
              />
            </label>
          </Button>

          {currentLogo && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRemoveLogo}
              disabled={isUploading || isDeleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
