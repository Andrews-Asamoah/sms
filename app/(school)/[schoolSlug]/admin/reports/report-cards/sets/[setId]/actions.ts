"use server";

import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { revalidatePath } from "next/cache";

export async function deleteReportCardSet(
  schoolSlug: string,
  setId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner" &&
      !session.isSuperAdmin
    ) {
      return { success: false, error: "Unauthorized" };
    }

    const set = await prisma.reportCardSet.findUnique({
      where: { id: setId },
      select: { id: true, status: true, schoolId: true },
    });

    if (!set) return { success: false, error: "Report card set not found" };
    if (set.status === "PUBLISHED") {
      return {
        success: false,
        error: "Published report card sets cannot be deleted.",
      };
    }

    await prisma.reportCardSet.delete({ where: { id: setId } });

    revalidatePath(`/${schoolSlug}/admin/reports/report-cards`);
    return { success: true };
  } catch (error) {
    console.error("[DELETE_REPORT_CARD_SET]", error);
    return { success: false, error: "Failed to delete report card set" };
  }
}

export async function unpublishReportCardSet(
  schoolSlug: string,
  setId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner" &&
      !session.isSuperAdmin
    ) {
      return { success: false, error: "Unauthorized" };
    }

    const set = await prisma.reportCardSet.findUnique({
      where: { id: setId },
      select: { id: true, status: true, schoolId: true },
    });

    if (!set) return { success: false, error: "Report card set not found" };
    if (set.status !== "PUBLISHED") {
      return { success: false, error: "Only published sets can be unpublished." };
    }

    // Revert set status back to GENERATED and clear publishedAt on report cards
    await prisma.$transaction([
      prisma.reportCardSet.update({
        where: { id: setId },
        data: { status: "GENERATED", publishAt: null },
      }),
      prisma.reportCard.updateMany({
        where: { setId },
        data: { publishedAt: null },
      }),
    ]);

    revalidatePath(`/${schoolSlug}/admin/reports/report-cards`);
    revalidatePath(`/${schoolSlug}/admin/reports/report-cards/sets/${setId}`);
    return { success: true };
  } catch (error) {
    console.error("[UNPUBLISH_REPORT_CARD_SET]", error);
    return { success: false, error: "Failed to unpublish report card set" };
  }
}

export async function updateReportCardSet(
  schoolSlug: string,
  setId: string,
  data: { name?: string; publishAt?: string | null },
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner" &&
      !session.isSuperAdmin
    ) {
      return { success: false, error: "Unauthorized" };
    }

    const set = await prisma.reportCardSet.findUnique({
      where: { id: setId },
      select: { schoolId: true },
    });

    if (!set) return { success: false, error: "Report card set not found" };

    await prisma.reportCardSet.update({
      where: { id: setId },
      data: {
        ...(data.name ? { name: data.name } : {}),
        publishAt: data.publishAt ? new Date(data.publishAt) : null,
      },
    });

    revalidatePath(`/${schoolSlug}/admin/reports/report-cards`);
    revalidatePath(`/${schoolSlug}/admin/reports/report-cards/sets/${setId}`);
    return { success: true };
  } catch (error) {
    console.error("[UPDATE_REPORT_CARD_SET]", error);
    return { success: false, error: "Failed to update report card set" };
  }
}

export async function updateReportCardData(
  schoolSlug: string,
  setId: string,
  studentId: string,
  data: any,
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner" &&
      !session.isSuperAdmin
    ) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.reportCard.update({
      where: { setId_studentId: { setId, studentId } },
      data: { data },
    });

    revalidatePath(`/${schoolSlug}/admin/reports/report-cards/sets/${setId}`);
    revalidatePath(
      `/${schoolSlug}/admin/reports/report-cards/sets/${setId}/students/${studentId}`,
    );
    return { success: true };
  } catch (error) {
    console.error("[UPDATE_REPORT_CARD_DATA]", error);
    return { success: false, error: "Failed to update report card data" };
  }
}
