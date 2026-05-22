// actions/school-data.ts
"use server";

import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateSchoolBasicInfo(
  schoolId: string,
  data: {
    name?: string;
    motto?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    website?: string | null;
  }
) {
  const session = await getAuthSession();
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // 1. Fetch school and check permissions
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { organizationId: true, subdomain: true },
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
      session.isSuperAdmin ||
      (member &&
        (member.role.includes("owner") || member.role.includes("admin")));

    if (!isAuthorized) {
      return {
        success: false,
        error: "Permission denied. Only owners or admins can update school info.",
      };
    }

    // 2. Update DB
    await prisma.school.update({
      where: { id: schoolId },
      data: {
        name: data.name,
        motto: data.motto,
        email: data.email,
        phone: data.phone,
        address: data.address,
        website: data.website,
      },
    });

    // Also update organization name if school name changed
    if (data.name) {
      await prisma.organization.update({
        where: { id: school.organizationId },
        data: { name: data.name },
      });
    }

    revalidatePath(`/${school.subdomain}/admin/settings`);
    revalidatePath("/");
    
    return { success: true };
  } catch (error: any) {
    console.error("updateSchoolBasicInfo error:", error);
    return {
      success: false,
      error: "An unexpected error occurred during update",
    };
  }
}

export async function updateSchoolSMSSettings(
  schoolId: string,
  data: {
    useCustomSMS: boolean;
    hubtelClientId?: string | null;
    hubtelClientSecret?: string | null;
    hubtelSenderId?: string | null;
  }
) {
  const session = await getAuthSession();
  if (!session) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { organizationId: true, subdomain: true, settings: true },
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
      session.isSuperAdmin ||
      (member &&
        (member.role.includes("owner") || member.role.includes("admin")));

    if (!isAuthorized) {
      return {
        success: false,
        error: "Permission denied. Only owners or admins can update school settings.",
      };
    }

    const currentSettings = (school.settings as Record<string, unknown>) || {};
    const updatedSettings = {
      ...currentSettings,
      useCustomSMS: data.useCustomSMS,
      hubtelClientId: data.hubtelClientId,
      hubtelClientSecret: data.hubtelClientSecret,
      hubtelSenderId: data.hubtelSenderId,
    };

    await prisma.school.update({
      where: { id: schoolId },
      data: {
        settings: updatedSettings as any,
      },
    });

    revalidatePath(`/${school.subdomain}/admin/settings`);
    
    return { success: true };
  } catch (error: any) {
    console.error("updateSchoolSMSSettings error:", error);
    return {
      success: false,
      error: "An unexpected error occurred during update",
    };
  }
}
