// lib/utils/academic-context.ts
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

interface SchoolSettings {
  currentAcademicYearId?: string;
  currentTermId?: string;
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
  [key: string]: unknown;
}

/**
 * Gets the active academic year and term for the current user
 * - For students, teachers, and regular staff: Returns global settings
 * - For admins, owners, and superAdmins: Returns session override or global settings
 */
export async function getActiveAcademicContext(schoolId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  // Get school with global settings
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      settings: true,
    },
  });

  if (!school) {
    throw new Error("School not found");
  }

  const globalSettings = (school.settings as SchoolSettings) || {};
  const globalAcademicYearId = globalSettings.currentAcademicYearId;
  const globalTermId = globalSettings.currentTermId;

  // Check if user has session override permission (admin/owner)
  const userSession = await prisma.session.findUnique({
    where: { id: session.session.id },
    select: {
      user: {
        select: {
          role: true,
          memberships: {
            where: { organization: { school: { id: schoolId } } },
            select: { role: true },
          },
        },
      },
    },
  });

  const canOverride =
    userSession?.user.role === "admin" ||
    userSession?.user.memberships.some(
      (m) => m.role === "admin" || m.role === "owner"
    );

  // For now, we use global settings
  // TODO: Implement session-level overrides if needed
  // You can store custom overrides in session metadata or a separate table
  const activeYearId = globalAcademicYearId;
  const activeTermId = globalTermId;

  // Fetch the actual academic year and term
  const academicYear = activeYearId
    ? await prisma.academicYear.findUnique({
        where: { id: activeYearId },
        include: {
          terms: {
            where: activeTermId ? { id: activeTermId } : undefined,
          },
        },
      })
    : null;

  const term = academicYear?.terms[0] || null;

  return {
    academicYear,
    term,
    canOverride,
    isUsingGlobal: activeYearId === globalAcademicYearId,
  };
}

/**
 * Helper to get just the IDs for filtering queries
 */
export async function getActiveAcademicIds(schoolId: string) {
  const context = await getActiveAcademicContext(schoolId);
  return {
    academicYearId: context.academicYear?.id || null,
    termId: context.term?.id || null,
  };
}
