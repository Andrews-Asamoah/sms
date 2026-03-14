"use server";

import { requireSuperAdmin } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateSchoolStatus(
  schoolId: string,
  subdomain: string,
  action: "suspend" | "archive" | "activate",
) {
  try {
    await requireSuperAdmin();

    let newStatus: any = "";
    if (action === "suspend") newStatus = "PAST_DUE";
    else if (action === "archive") newStatus = "CANCELED";
    else if (action === "activate") newStatus = "ACTIVE";

    // Update the school's subscription
    await prisma.subscription.update({
      where: { schoolId },
      data: { status: newStatus },
    });

    revalidatePath("/schools");
    revalidatePath(`/schools/${subdomain}`);
    revalidatePath("/schools/directory/active");
    revalidatePath("/schools/directory/suspended");
    revalidatePath("/schools/directory/archived");

    return {
      success: true,
      message: `School successfully ${action === "activate" ? "activated" : action + "d"}.`,
    };
  } catch (error: any) {
    console.error("Error updating school status:", error);
    return {
      success: false,
      error: error.message || "Failed to update school status.",
    };
  }
}
