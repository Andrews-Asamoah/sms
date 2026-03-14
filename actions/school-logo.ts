// actions/school-logo.ts
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
 * Update school logo
 */
export async function updateSchoolLogo(schoolId: string, formData: FormData) {
  const session = await getAuthSession();
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // 1. Fetch school and check permissions
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, subdomain: true, logo: true, organizationId: true },
    });

    if (!school) {
      return { success: false, error: "School not found" };
    }

    // Permission check: User must be member of this organization with owner/admin role
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
        error: "Permission denied. Only owners or admins can update the logo.",
      };
    }

    // 2. Validate logo — accept key 'logo' (settings editor) or 'file' (creation form fallback)
    const file = (formData.get("logo") ?? formData.get("file")) as File | null;
    if (!file || file.size === 0) {
      return { success: false, error: "No logo file provided" };
    }


    const validation = validateImageFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // 3. Build key
    const key = r2Keys.schoolLogo(school.subdomain, validation.ext!);

    // 4. Convert and Replace
    const buffer = await fileToBuffer(file);
    const result = await replaceFile(
      buffer,
      key,
      validation.mimeType!,
      school.logo,
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Failed to upload to R2",
      };
    }

    // 5. Update DB (atomic update for both school and organization)
    await prisma.$transaction([
      prisma.school.update({
        where: { id: schoolId },
        data: { logo: result.url },
      }),
      prisma.organization.update({
        where: { id: school.organizationId },
        data: { logo: result.url },
      }),
    ]);

    revalidatePath("/");
    return { success: true, logoUrl: result.url };
  } catch (error: any) {
    console.error("updateSchoolLogo error:", error);
    return {
      success: false,
      error: "An unexpected error occurred during logo update",
    };
  }
}

/**
 * Delete school logo
 */
export async function deleteSchoolLogo(schoolId: string) {
  const session = await getAuthSession();
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // 1. Fetch school and check permissions
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, logo: true, organizationId: true },
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

    if (school.logo) {
      // 2. Delete from R2
      const key = extractKeyFromUrl(school.logo);
      if (key) {
        await deleteFile(key);
      }
    }

    // 3. Update DB
    await prisma.$transaction([
      prisma.school.update({
        where: { id: schoolId },
        data: { logo: null },
      }),
      prisma.organization.update({
        where: { id: school.organizationId },
        data: { logo: null },
      }),
    ]);

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("deleteSchoolLogo error:", error);
    return { success: false, error: "Failed to delete school logo" };
  }
}
