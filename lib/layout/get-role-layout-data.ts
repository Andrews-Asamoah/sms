// lib/layout/get-role-layout-data.ts

import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import {
  getSchoolRole,
  getAllRolesInSchool,
  getActiveSchoolRole,
} from "@/lib/auth/school-access";
import { getNavPermissions } from "@/lib/permissions/utils";
import { checkSubscriptionStatus } from "@/lib/subscription/lifecycle";
import type { SubscriptionLifecycleStatus } from "@/lib/subscription/lifecycle";

// ============================================================================
// TYPES
// ============================================================================

interface SchoolSettings {
  currentAcademicYearId?: string;
  currentTermId?: string;
}

export interface RoleLayoutData {
  session: Awaited<ReturnType<typeof getSession>>;
  school: {
    id: string;
    name: string;
    logo: string | null;
    subdomain: string;
    subscription: {
      planName: string;
      status: string;
      amount: string | null;
    } | null;
  };
  subscriptionStatus: SubscriptionLifecycleStatus | null;
  schoolRole: ReturnType<typeof getSchoolRole> & { effectiveRole: string };
  academicYear: string;
  currentTerm: string | null;
  allRoles: ReturnType<typeof getAllRolesInSchool>;
  permissions: Awaited<ReturnType<typeof getNavPermissions>>;
  userData: {
    id: string;
    name: string;
    email: string;
    avatar: string | undefined;
    role: string;
  };
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

export async function getRoleLayoutData(
  schoolSlug: string,
  requiredRole: string | string[],
): Promise<RoleLayoutData> {
  // ── 1. Auth ────────────────────────────────────────────────────────────────
  const session = await getSession();

  if (!session) {
    const firstRole = Array.isArray(requiredRole)
      ? requiredRole[0]
      : requiredRole;
    redirect(`/auth/login?callbackUrl=/${schoolSlug}/${firstRole}`);
  }

  const schoolRole = getSchoolRole(session, schoolSlug);
  if (!schoolRole) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  const allowedRoles = Array.isArray(requiredRole)
    ? requiredRole
    : [requiredRole];

  const hasRequiredRole =
    allowedRoles.includes(schoolRole.effectiveRole) ||
    schoolRole.profileRoles.some((role) => allowedRoles.includes(role));

  if (!hasRequiredRole) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  // ── 2. Load school — select only fields that are used below ────────────────
  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: {
      id: true,
      name: true,
      logo: true,
      subdomain: true,
      settings: true,
      subscription: {
        select: {
          planName: true,
          status: true,
          amount: true,
        },
      },
    },
  });

  if (!school) {
    notFound();
  }

  // ── 3. Resolve working context from cookies (user preference) or settings ──
  //
  // Priority: 1. Cookie (user explicitly switched) 2. School settings (default)
  //
  const cookieStore = await cookies();
  const workingYearId = cookieStore.get(
    `sms_working_year_${schoolSlug}`,
  )?.value;
  const workingTermId = cookieStore.get(
    `sms_working_term_${schoolSlug}`,
  )?.value;

  const settings = (school.settings as SchoolSettings) ?? {};
  const effectiveYearId = workingYearId ?? settings.currentAcademicYearId;
  const effectiveTermId = workingTermId ?? settings.currentTermId;

  // ── 4. Load academic year + terms ─────────────────────────────────────────
  const academicYear = effectiveYearId
    ? await prisma.academicYear.findUnique({
        where: { id: effectiveYearId },
        select: {
          name: true,
          terms: {
            orderBy: { termNumber: "asc" },
            select: { id: true, name: true, isCurrent: true },
          },
        },
      })
    : null;

  // Term resolution priority:
  //   1. Cookie term (if it belongs to the resolved year)
  //   2. School settings term (if it belongs to the resolved year)
  //   3. The term flagged isCurrent on the year
  //   4. The first term on the year
  let activeTerm: { id: string; name: string } | null = null;
  if (academicYear && academicYear.terms.length > 0) {
    if (workingTermId) {
      activeTerm =
        academicYear.terms.find((t) => t.id === workingTermId) ?? null;
    }
    if (!activeTerm && settings.currentTermId) {
      activeTerm =
        academicYear.terms.find((t) => t.id === settings.currentTermId) ?? null;
    }
    if (!activeTerm) {
      activeTerm =
        academicYear.terms.find((t) => t.isCurrent) ??
        academicYear.terms[0] ??
        null;
    }
  }

  // ── 5. Role resolution ─────────────────────────────────────────────────────
  const activeSchoolRole = await getActiveSchoolRole(session, schoolSlug);
  const currentActiveRole =
    activeSchoolRole?.effectiveRole ?? schoolRole.effectiveRole;
  const allRoles = getAllRolesInSchool(session, schoolSlug);

  // ── 6. Permissions + user data ─────────────────────────────────────────────
  const [permissions, freshUser] = await Promise.all([
    getNavPermissions(session, schoolSlug),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { image: true, name: true },
    }),
  ]);

  const userData = {
    id: session.user.id,
    name: freshUser?.name ?? session.user.name ?? "User",
    email: session.user.email,
    avatar: freshUser?.image ?? session.user.image ?? undefined,
    role: currentActiveRole,
  };

  // ── 7. Subscription lifecycle check ───────────────────────────────────────
  const rawSubscriptionStatus = await checkSubscriptionStatus(school.id);

  // Serialize the Date field explicitly — avoids the JSON.parse(JSON.stringify())
  // antipattern while still producing a plain object safe to pass as a prop.
  const subscriptionStatus: SubscriptionLifecycleStatus | null =
    rawSubscriptionStatus
      ? {
          ...rawSubscriptionStatus,
          currentPeriodEnd: rawSubscriptionStatus.currentPeriodEnd
            ? new Date(rawSubscriptionStatus.currentPeriodEnd)
            : null,
        }
      : null;

  // ── 8. Return ──────────────────────────────────────────────────────────────
  return {
    session,
    school: {
      id: school.id,
      name: school.name,
      logo: school.logo,
      subdomain: school.subdomain,
      subscription: school.subscription
        ? {
            planName: school.subscription.planName,
            status: school.subscription.status,
            // Decimal → string safely (handles null and Prisma Decimal objects)
            amount:
              school.subscription.amount != null
                ? Number(school.subscription.amount).toFixed(2)
                : null,
          }
        : null,
    },
    subscriptionStatus,
    schoolRole: {
      ...schoolRole,
      effectiveRole: currentActiveRole,
    },
    academicYear: academicYear?.name ?? "No Active Year",
    currentTerm: activeTerm?.name ?? null,
    allRoles,
    permissions,
    userData,
  };
}
