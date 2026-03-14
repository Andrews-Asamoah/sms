// actions/profile-image.ts
"use server";

import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  deleteFile,
  replaceFile,
  extractKeyFromUrl,
  r2Keys,
} from "@/lib/storage/r2";
import { validateImageFile, fileToBuffer } from "@/lib/storage/validate";

/**
 * Update current user's profile image
 */
export async function updateProfileImage(formData: FormData) {
  const session = await getAuthSession();
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  const file = formData.get("image") as File;
  if (!file) {
    return { success: false, error: "No image file provided" };
  }

  // 1. Validate image
  const validation = validateImageFile(file);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    const userId = session.user.id;
    const activeOrganizationId = session.session.activeOrganizationId;

    // 2. Determine school slug for partitioning
    let schoolSlug = (formData.get("schoolSlug") as string) || "global";

    // If schoolSlug is "global" (or default), try to resolve it from the active organization
    if (schoolSlug === "global" && activeOrganizationId) {
      const school = await prisma.school.findUnique({
        where: { organizationId: activeOrganizationId },
        select: { subdomain: true },
      });
      if (school) {
        schoolSlug = school.subdomain;
      }
    }

    // 3. Build key
    const key = r2Keys.profileImage(schoolSlug, userId, validation.ext!);

    // 4. Get current user image for cleanup
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { image: true },
    });

    // 5. Convert and Replace
    const buffer = await fileToBuffer(file);
    const result = await replaceFile(
      buffer,
      key,
      validation.mimeType!,
      user?.image,
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Failed to upload to R2",
      };
    }

    // 6. Update DB
    await prisma.user.update({
      where: { id: userId },
      data: { image: result.url },
    });

    revalidatePath("/");
    return { success: true, imageUrl: result.url };
  } catch (error: any) {
    console.error("updateProfileImage error:", error);
    return {
      success: false,
      error: "An unexpected error occurred during upload",
    };
  }
}

/**
 * Delete current user's profile image
 */
export async function deleteProfileImage() {
  const session = await getAuthSession();
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const userId = session.user.id;

    // 1. Fetch current image
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { image: true },
    });

    if (user?.image) {
      // 2. Extract key and delete from R2
      const key = extractKeyFromUrl(user.image);
      if (key) {
        await deleteFile(key);
      }
    }

    // 3. Update DB
    await prisma.user.update({
      where: { id: userId },
      data: { image: null },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("deleteProfileImage error:", error);
    return { success: false, error: "Failed to delete profile image" };
  }
}
