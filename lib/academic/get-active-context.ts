// lib/academic/get-active-context.ts

import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

interface SchoolSettings {
  currentAcademicYearId?: string;
  currentTermId?: string;
  [key: string]: unknown;
}

export interface AcademicContext {
  academicYearId: string | undefined;
  termId: string | undefined;
  academicYearName: string | null;
  termName: string | null;
  isGlobal: boolean;
}

/**
 * Resolves the active academic context for a given school and user.
 *
 * @param schoolSlug  The school's URL subdomain
 * @param userId      The logged-in user's ID (makes cookies user-scoped)
 * @param settings    The school.settings JSON field (already fetched from DB)
 * @param opts.withNames  If true (default), fetches human-readable names via DB
 */
export async function getActiveContext(
  schoolSlug: string,
  userId: string,
  settings: SchoolSettings | null | undefined,
  opts: { withNames?: boolean } = { withNames: true },
): Promise<AcademicContext> {
  const cookieStore = await cookies();

  // User-scoped cookie keys — each user gets their own independent context
  const yearCookie = cookieStore.get(
    `sms_working_year_${schoolSlug}_${userId}`,
  )?.value;
  const termCookie = cookieStore.get(
    `sms_working_term_${schoolSlug}_${userId}`,
  )?.value;

  const s = settings ?? {};
  const isGlobal = !yearCookie && !termCookie;

  const academicYearId = yearCookie ?? s.currentAcademicYearId;
  const termId = termCookie ?? s.currentTermId;

  if (!opts.withNames) {
    return {
      academicYearId,
      termId,
      academicYearName: null,
      termName: null,
      isGlobal,
    };
  }

  const [yearRecord, termRecord] = await Promise.all([
    academicYearId
      ? prisma.academicYear.findUnique({
          where: { id: academicYearId },
          select: { name: true },
        })
      : null,
    termId
      ? prisma.term.findUnique({
          where: { id: termId },
          select: { name: true },
        })
      : null,
  ]);

  return {
    academicYearId,
    termId,
    academicYearName: yearRecord?.name ?? null,
    termName: termRecord?.name ?? null,
    isGlobal,
  };
}
