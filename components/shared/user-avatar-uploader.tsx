// components/shared/user-avatar-uploader.tsx
"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Trash2, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { updateUserImageByAdmin, deleteUserImageByAdmin, type EntityType } from "@/actions/user-image";

interface UserAvatarUploaderProps {
  /** The BetterAuth userId of the person being edited */
  userId: string;
  /** The school this person belongs to — used for R2 partitioning and auth */
  schoolSlug: string;
  /** Which storage folder to use */
  entityType: EntityType;
  /** Currently stored image URL */
  currentImage?: string | null;
  /** Display name used for initials fallback */
  displayName: string;
  /** Extra class names for the container */
  className?: string;
  /** Called after a successful upload/delete so the parent can refresh */
  onSuccess?: (newImageUrl: string | null) => void;
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * A reusable avatar uploader for admin-managed user profiles.
 *
 * - Renders a circular avatar with a floating camera button
 * - Validates file type / size client-side before uploading
 * - Calls the `updateUserImageByAdmin` server action which:
 *     • optimises the image with sharp (→ 400×400 WebP)
 *     • uploads to the correct R2 folder
 *     • deletes the previous image from R2
 *     • updates user.image in the DB
 */
export function UserAvatarUploader({
  userId,
  schoolSlug,
  entityType,
  currentImage,
  displayName,
  className,
  onSuccess,
}: UserAvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const busy = isUploading || isDeleting;
  const displayImage = preview ?? currentImage;
  const initials = getInitials(displayName);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side pre-validation (mirrors server validate.ts)
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPEG, PNG and WebP images are supported");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be 2 MB or smaller");
      return;
    }

    // Optimistic preview
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    setIsUploading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const result = await updateUserImageByAdmin(userId, formData, entityType, schoolSlug);
      if (result.success) {
        toast.success("Photo updated");
        onSuccess?.(result.imageUrl ?? null);
      } else {
        setPreview(null); // revert optimistic preview on failure
        toast.error(result.error ?? "Upload failed");
      }
    } catch {
      setPreview(null);
      toast.error("An error occurred while uploading the photo");
    } finally {
      setIsUploading(false);
      // Allow re-uploading the same file
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const result = await deleteUserImageByAdmin(userId, schoolSlug);
      if (result.success) {
        setPreview(null);
        toast.success("Photo removed");
        onSuccess?.(null);
      } else {
        toast.error(result.error ?? "Delete failed");
      }
    } catch {
      toast.error("An error occurred while removing the photo");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className={cn("relative group flex flex-col items-center gap-3", className)}>
      <div className="relative">
        <Avatar className="h-24 w-24 border-4 border-background shadow-lg ring-2 ring-border transition-all group-hover:ring-primary/30">
          <AvatarImage src={displayImage ?? ""} alt={displayName} className="object-cover" />
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/40 text-primary text-xl font-semibold">
            {initials || <User className="h-8 w-8" />}
          </AvatarFallback>
        </Avatar>

        {/* Busy overlay */}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          </div>
        )}

        {/* Camera button */}
        <label
          htmlFor={`avatar-upload-${userId}`}
          className={cn(
            "absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground",
            "flex items-center justify-center cursor-pointer shadow-md",
            "transition-transform hover:scale-110 active:scale-95",
            "border-2 border-background",
            busy && "opacity-50 pointer-events-none"
          )}
          title="Change photo"
        >
          <Camera className="h-3.5 w-3.5" />
          <input
            ref={inputRef}
            id={`avatar-upload-${userId}`}
            type="file"
            className="sr-only"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            disabled={busy}
          />
        </label>
      </div>

      {/* Remove button — only shown when there is an actual stored image */}
      {(currentImage || preview) && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="mr-1 h-3 w-3" />
              Remove
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove profile photo?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete {displayName}&apos;s profile photo.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Remove Photo
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
