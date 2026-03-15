// components/settings/profile-image-editor.tsx
"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, Trash2, Upload, User } from "lucide-react";
import { toast } from "sonner";
import { updateProfileImage, deleteProfileImage } from "@/actions/profile-image";
import { cn } from "@/lib/utils";
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

import { useParams } from "next/navigation";

interface ProfileImageEditorProps {
  currentImage?: string | null;
  userName: string;
  className?: string;
}

export function ProfileImageEditor({
  currentImage,
  userName,
  className,
}: ProfileImageEditorProps) {
  const params = useParams();
  const schoolSlug = params?.schoolSlug as string;
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("image", file);
    if (schoolSlug) {
      formData.append("schoolSlug", schoolSlug);
    }

    try {
      const result = await updateProfileImage(formData);
      if (result.success) {
        toast.success("Profile picture updated successfully");
      } else {
        toast.error(result.error || "Failed to update profile picture");
      }
    } catch (error) {
      toast.error("An error occurred while uploading the image");
    } finally {
      setIsUploading(false);
      // Reset input value to allow re-uploading the same file if needed
      e.target.value = "";
    }
  }

  async function handleRemoveImage() {
    setIsDeleting(true);
    try {
      const result = await deleteProfileImage();
      if (result.success) {
        toast.success("Profile picture removed successfully");
      } else {
        toast.error(result.error || "Failed to remove profile picture");
      }
    } catch (error) {
      toast.error("An error occurred while removing the image");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className={cn("relative group flex flex-col items-center", className)}>
      <div className="relative">
        <Avatar className="h-28 w-28 border-4 border-white dark:border-slate-800 shadow-2xl transition-all duration-500 group-hover:scale-105 group-hover:shadow-blue-500/20 ring-4 ring-transparent group-hover:ring-blue-500/10">
          <AvatarImage src={currentImage || ""} alt={userName} className="object-cover" />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-3xl font-bold">
            {initials || <User className="h-10 w-10" />}
          </AvatarFallback>
        </Avatar>

        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-[2px] z-20">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
        )}

        {/* Floating Upload Button */}
        <label
          htmlFor="profile-image-upload"
          className={cn(
            "absolute bottom-0 right-0 h-9 w-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center cursor-pointer shadow-lg transition-all hover:scale-110 active:scale-95 border-2 border-white dark:border-slate-800 z-10",
            (isUploading || isDeleting) && "opacity-50 cursor-not-allowed pointer-events-none"
          )}
        >
          <Camera className="h-4 w-4" />
          <input
            id="profile-image-upload"
            type="file"
            className="sr-only"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={isUploading || isDeleting}
          />
        </label>
      </div>

      {currentImage && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={isUploading || isDeleting}
              className="mt-4 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Remove Image
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Profile Picture?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove your profile picture? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleRemoveImage}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Remove Image"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
