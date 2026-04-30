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
import sharp from "sharp";

export type EntityType = "student" | "teacher" | "staff" | "profile";

/**
 * Update a user's profile image by an admin
 */
export async function updateUserImageByAdmin(
  targetUserId: string,
  formData: FormData,
  entityType: EntityType,
  schoolSlug: string,
) {
  const session = await getAuthSession();
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // 1. Fetch the school to get organizationId
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true, organizationId: true },
    });

    if (!school) {
      return { success: false, error: "School not found" };
    }

    // 2. Permission check: User must be member of this organization with owner/admin role
    // SuperAdmins are owners of all orgs in our setup, but we also check the member table.
    const member = await prisma.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: school.organizationId,
          userId: session.user.id,
        },
      },
      select: { role: true },
    });

    const isAuthorized =
      session.user.role === "superAdmin" ||
      (member &&
        (member.role.includes("owner") || member.role.includes("admin")));

    if (!isAuthorized) {
      return {
        success: false,
        error:
          "Permission denied. Only owners or admins can update user images.",
      };
    }

    // 3. Verify the target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, image: true },
    });

    if (!targetUser) {
      return { success: false, error: "Target user not found" };
    }

    // 4. Validate image
    const file = (formData.get("image") ?? formData.get("file")) as File | null;
    if (!file || file.size === 0) {
      return { success: false, error: "No image file provided" };
    }

    const validation = validateImageFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // 5. Optimize the image using sharp
    const buffer = await fileToBuffer(file);
    let optimizedBuffer: Buffer;
    try {
      optimizedBuffer = await sharp(buffer)
        .resize(400, 400, { fit: "cover", position: "attention" })
        .webp({ quality: 80 })
        .toBuffer();
    } catch (sharpError) {
      console.error("Image optimization failed:", sharpError);
      return { success: false, error: "Failed to optimize image format." };
    }

    // Since we converted to WebP
    const mimeType = "image/webp";
    const ext = "webp";

    // 6. Build key
    let key: string;
    switch (entityType) {
      case "student":
        key = r2Keys.studentImage(schoolSlug, targetUserId, ext);
        break;
      case "teacher":
        key = r2Keys.teacherImage(schoolSlug, targetUserId, ext);
        break;
      case "staff":
        key = r2Keys.staffImage(schoolSlug, targetUserId, ext);
        break;
      default:
        key = r2Keys.profileImage(schoolSlug, targetUserId, ext);
    }

    // 7. Upload to R2 (replaces old file if it exists and deletes old key if different)
    const result = await replaceFile(
      optimizedBuffer,
      key,
      mimeType,
      targetUser.image,
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Failed to upload to R2",
      };
    }

    // 8. Update DB
    await prisma.user.update({
      where: { id: targetUserId },
      data: { image: result.url },
    });

    revalidatePath(`/${schoolSlug}/admin`);
    return { success: true, imageUrl: result.url };
  } catch (error: any) {
    console.error("updateUserImageByAdmin error:", error);
    return {
      success: false,
      error: "An unexpected error occurred during image update",
    };
  }
}

/**
 * Delete a user's profile image by an admin
 */
export async function deleteUserImageByAdmin(
  targetUserId: string,
  schoolSlug: string,
) {
  const session = await getAuthSession();
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true, organizationId: true },
    });

    if (!school) {
      return { success: false, error: "School not found" };
    }

    const member = await prisma.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: school.organizationId,
          userId: session.user.id,
        },
      },
      select: { role: true },
    });

    const isAuthorized =
      session.user.role === "superAdmin" ||
      (member &&
        (member.role.includes("owner") || member.role.includes("admin")));

    if (!isAuthorized) {
      return { success: false, error: "Permission denied." };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, image: true },
    });

    if (targetUser?.image) {
      const key = extractKeyFromUrl(targetUser.image);
      if (key) {
        await deleteFile(key);
      }
    }

    await prisma.user.update({
      where: { id: targetUserId },
      data: { image: null },
    });

    revalidatePath(`/${schoolSlug}/admin`);
    return { success: true };
  } catch (error) {
    console.error("deleteUserImageByAdmin error:", error);
    return { success: false, error: "Failed to delete user image" };
  }
}
