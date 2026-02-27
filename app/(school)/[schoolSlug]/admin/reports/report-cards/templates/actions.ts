"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const SYSTEM_TEMPLATES = [
  {
    name: "Standard Terminal Report",
    description: "Standard layout with 30% Class Work and 70% Exam split.",
    layout: {
      type: "standard",
      showClassWork: true,
      showExam: true,
      classWorkWeight: 30,
      examWeight: 70,
    },
  },
  {
    name: "Mock Examination Report",
    description: "Mock exam layout focusing on 100% Total Score.",
    layout: {
      type: "mock",
      showClassWork: false,
      showExam: true,
      examWeight: 100,
    },
  },
  {
    name: "Progress Report",
    description: "Simplified report for mid-term assessments.",
    layout: {
      type: "progress",
      showClassWork: true,
      showExam: false,
      classWorkWeight: 100,
    },
  },
];

export async function initializeDefaultTemplates(schoolSlug: string) {
  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
  });

  if (!school) throw new Error("School not found");

  // Only create if no templates exist
  const existingCount = await prisma.reportCardTemplate.count({
    where: { schoolId: school.id },
  });

  if (existingCount > 0)
    return { success: true, message: "Templates already exist" };

  await prisma.reportCardTemplate.createMany({
    data: SYSTEM_TEMPLATES.map((t) => ({
      ...t,
      schoolId: school.id,
      isActive: true,
    })),
  });

  revalidatePath(`/${schoolSlug}/admin/reports/report-cards/templates`);
  return { success: true, message: "Default templates initialized" };
}

export async function toggleTemplateStatus(
  templateId: string,
  schoolSlug: string,
) {
  const template = await prisma.reportCardTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template) throw new Error("Template not found");

  await prisma.reportCardTemplate.update({
    where: { id: templateId },
    data: { isActive: !template.isActive },
  });

  revalidatePath(`/${schoolSlug}/admin/reports/report-cards/templates`);
}
