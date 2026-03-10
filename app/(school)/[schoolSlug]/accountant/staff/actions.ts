// app/(school)/[schoolSlug]/accountant/people/staff/actions.ts
"use server";

import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { revalidatePath } from "next/cache";

export async function updateStaffSalary(
  schoolSlug: string,
  id: string,
  type: "TEACHER" | "STAFF",
  salary: number
) {
  const session = await requireSchoolAccess(schoolSlug);
  const role = getSchoolRole(session, schoolSlug);

  if (role?.effectiveRole !== "accountant" && !session.isSuperAdmin) {
    throw new Error("Unauthorized");
  }

  if (type === "TEACHER") {
    await prisma.teacher.update({
      where: { id },
      data: { monthlySalary: salary },
    });
  } else {
    await prisma.staff.update({
      where: { id },
      data: { monthlySalary: salary },
    });
  }

  revalidatePath(`/${schoolSlug}/accountant/people/staff`);
  return { success: true };
}
