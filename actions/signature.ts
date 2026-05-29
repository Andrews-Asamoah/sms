// actions/signature.ts
"use server";

import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  deleteFile,
  replaceFile,
  extractKeyFromUrl,
} from "@/lib/storage/r2";
import { validateImageFile, fileToBuffer } from "@/lib/storage/validate";
import crypto from "crypto";

/**
 * Upload or replace the current user's digital signature.
 * Signature images are stored in R2 under:
 *   signatures/<userId>-<random>.ext
 * The random suffix prevents URL guessing.
 */
export async function updateSignature(formData: FormData) {
  const session = await getAuthSession();
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const file = formData.get("signature") as File | null;
    if (!file || file.size === 0) {
      return { success: false, error: "No signature file provided" };
    }

    const validation = validateImageFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Build a secure key with random suffix to prevent URL guessing
    const randomSuffix = crypto.randomUUID().slice(0, 8);
    const key = `signatures/${session.user.id}-${randomSuffix}.${validation.ext}`;

    // Get existing signature URL for cleanup
    const profile = await prisma.userProfile.findUnique({
      where: { userId: session.user.id },
      select: { signatureUrl: true },
    });

    const buffer = await fileToBuffer(file);
    const result = await replaceFile(
      buffer,
      key,
      validation.mimeType!,
      profile?.signatureUrl,
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Failed to upload signature",
      };
    }

    // Update database
    await prisma.userProfile.update({
      where: { userId: session.user.id },
      data: { signatureUrl: result.url },
    });

    revalidatePath("/account");
    revalidatePath("/", "layout");

    return { success: true, signatureUrl: result.url };
  } catch (error: any) {
    console.error("updateSignature error:", error);
    return {
      success: false,
      error: "An unexpected error occurred during signature upload",
    };
  }
}

/**
 * Delete the current user's digital signature.
 */
export async function deleteSignature() {
  const session = await getAuthSession();
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const profile = await prisma.userProfile.findUnique({
      where: { userId: session.user.id },
      select: { signatureUrl: true },
    });

    if (profile?.signatureUrl) {
      const key = extractKeyFromUrl(profile.signatureUrl);
      if (key) {
        await deleteFile(key);
      }
    }

    await prisma.userProfile.update({
      where: { userId: session.user.id },
      data: { signatureUrl: null },
    });

    revalidatePath("/account");
    revalidatePath("/", "layout");

    return { success: true };
  } catch (error) {
    console.error("deleteSignature error:", error);
    return { success: false, error: "Failed to delete signature" };
  }
}
