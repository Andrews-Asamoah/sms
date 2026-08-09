"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const SYSTEM_TEMPLATES = [
  {
    name: "Modern Executive Terminal Report",
    description: "Modern executive layout featuring navy pill headers, stat summaries, 5-star conduct metrics, remarks and grade key.",
    layout: {
      type: "modern_executive",
      showClassWork: true,
      showExam: true,
      classWorkWeight: 30,
      examWeight: 70,
    },
    disciplineConfig: {
      metrics: ["Punctuality", "Attentiveness", "Neatness", "Cooperation with Others", "Leadership Qualities", "Respect for Authority"],
      predictiveTracks: true,
    },
  },
  {
    name: "Classic Formal Report",
    description: "Classic standardized report card design with academic table, remarks, signatures, and grade key.",
    layout: {
      type: "classic",
      showClassWork: true,
      showExam: true,
      classWorkWeight: 30,
      examWeight: 70,
    },
  },
  {
    name: "Primary Standard Terminal Report",
    description: "Standard academic scores blended with Social-Emotional Learning (SEL) rubrics.",
    layout: {
      type: "primary",
      showClassWork: true,
      showExam: true,
      classWorkWeight: 30,
      examWeight: 70,
    },
    selConfig: {
      categories: ["Self-Awareness", "Self-Management", "Social Awareness", "Relationship Skills", "Responsible Decision-Making"],
      ratingScale: ["Needs Improvement", "Satisfactory", "Good", "Excellent"]
    }
  },
  {
    name: "JHS Detailed Examination Report",
    description: "Rigorous academic grading with discipline and readiness tracks.",
    layout: {
      type: "jhs",
      showClassWork: true,
      showExam: true,
      classWorkWeight: 30,
      examWeight: 70,
    },
    disciplineConfig: {
      metrics: ["Punctuality", "Conduct", "Attitude to Learning", "Neatness"],
      predictiveTracks: true
    }
  },
  {
    name: "Kindergarten Holistic Report",
    description: "Foundation skills tracking including fine motor and cognitive milestones.",
    layout: { type: "kindergarten" },
    developmentalConfig: {
      categories: ["Gross Motor Skills", "Fine Motor Skills", "Literacy", "Numeracy"],
      ratingScale: ["Emerging", "Expected", "Exceeding"]
    }
  },
  {
    name: "Creche & Nursery ReportCard",
    description: "Milestone-focused layout tracking developmental stages.",
    layout: { type: "creche" },
    developmentalConfig: {
      categories: ["Physical Development", "Language & Communication", "Social & Emotional"],
      ratingScale: ["Beginning", "Developing", "Secure"]
    }
  },
];

export async function initializeDefaultTemplates(schoolSlug: string) {
  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
  });

  if (!school) throw new Error("School not found");

  const existingTemplates = await prisma.reportCardTemplate.findMany({
    where: { schoolId: school.id },
  });

  const existingNames = new Set(existingTemplates.map((t) => t.name));

  const templatesToCreate = SYSTEM_TEMPLATES.filter(
    (t) => !existingNames.has(t.name)
  );

  if (templatesToCreate.length === 0) {
    return { success: true, message: "Templates already up to date" };
  }

  await prisma.reportCardTemplate.createMany({
    data: templatesToCreate.map((t) => ({
      ...t,
      schoolId: school.id,
      isActive: true,
    })),
  });

  revalidatePath(`/${schoolSlug}/admin/reports/report-cards/templates`);
  return { success: true, message: `${templatesToCreate.length} template(s) initialized` };
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

export async function updateTemplateProperties(
  templateId: string,
  schoolSlug: string,
  data: {
    departmentId?: string | null;
  }
) {
  const template = await prisma.reportCardTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template) throw new Error("Template not found");

  await prisma.reportCardTemplate.update({
    where: { id: templateId },
    data: { departmentId: data.departmentId },
  });

  revalidatePath(`/${schoolSlug}/admin/reports/report-cards/templates`);
  return { success: true };
}
