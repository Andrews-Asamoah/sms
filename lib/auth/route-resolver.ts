// lib/auth/route-resolver.ts
import type { ExtendedSession, EffectiveRole, ProfileRoleType } from "./types";
import { getPrimarySchool, hasRoleInSchool } from "./school-access";

export function getDefaultRoute(session: ExtendedSession): string {
  console.log("[Route Resolver] 🔍 Determining default route...");
  console.log(`[Route Resolver] User: ${session.user.email}`);
  console.log(`[Route Resolver] System Role: ${session.user.role}`);
  console.log(`[Route Resolver] Is Super Admin: ${session.isSuperAdmin}`);

  // ✅ CORRECT: Super Admin goes to /dashboard (system dashboard)
  if (session.isSuperAdmin) {
    console.log("[Route Resolver] ✅ Super Admin → /dashboard");
    return "/dashboard";
  }

  const primarySchool = getPrimarySchool(session);

  if (!primarySchool) {
    console.log("[Route Resolver] ❌ No school access → /onboarding");
    return "/onboarding";
  }

  const { subdomain, effectiveRole } = primarySchool;
  console.log(`[Route Resolver] Primary School: ${subdomain}`);
  console.log(`[Route Resolver] Effective Role: ${effectiveRole}`);

  // Routes for school users (not super admin)
  switch (effectiveRole) {
    case "owner":
    case "admin":
      console.log(
        `[Route Resolver] ✅ Admin/Owner → /${subdomain}/admin/dashboard`
      );
      return `/${subdomain}/admin/dashboard`;

    case "teacher":
      console.log(
        `[Route Resolver] ✅ Teacher → /${subdomain}/teacher/dashboard`
      );
      return `/${subdomain}/teacher/dashboard`;

    case "accountant":
      console.log(
        `[Route Resolver] ✅ Accountant → /${subdomain}/accountant/dashboard`
      );
      return `/${subdomain}/accountant/dashboard`;

    case "staff":
      console.log(`[Route Resolver] ✅ Staff → /${subdomain}/staff/dashboard`);
      return `/${subdomain}/staff/dashboard`;

    case "student":
      console.log(
        `[Route Resolver] ✅ Student → /${subdomain}/student/dashboard`
      );
      return `/${subdomain}/student/dashboard`;

    case "guardian":
      console.log(
        `[Route Resolver] ✅ Guardian → /${subdomain}/parent/dashboard`
      );
      return `/${subdomain}/parent/dashboard`;

    default:
      console.log("[Route Resolver] ⚠️ Unknown role → /onboarding");
      return "/onboarding";
  }
}

export function canAccessRoute(
  session: ExtendedSession,
  path: string
): boolean {
  if (session.isSuperAdmin) return true;

  const pathMatch = path.match(/^\/([^/]+)\//);
  if (!pathMatch) return false;

  const subdomain = pathMatch[1];

  const roleMatch = path.match(/^\/[^/]+\/([^/]+)\//);
  if (!roleMatch) {
    return hasRoleInSchool(session, subdomain, "member");
  }

  const routeRole = roleMatch[1];

  const roleRequirements: Record<string, string[]> = {
    admin: ["owner", "admin"],
    teacher: ["teacher", "owner", "admin"],
    student: ["student", "owner", "admin"],
    staff: ["staff", "owner", "admin"],
    accountant: ["accountant", "owner", "admin"],
    parent: ["guardian", "owner", "admin"],
  };

  const requiredRoles = roleRequirements[routeRole];
  if (!requiredRoles) return false;

  return requiredRoles.some((role) =>
    hasRoleInSchool(session, subdomain, role as EffectiveRole | ProfileRoleType)
  );
}

export function getAccessibleRoutes(
  session: ExtendedSession,
  subdomain: string
): string[] {
  const routes: string[] = [];

  if (session.isSuperAdmin) {
    return [
      `/${subdomain}/admin`,
      `/${subdomain}/teacher`,
      `/${subdomain}/student`,
      `/${subdomain}/staff`,
      `/${subdomain}/accountant`,
      `/${subdomain}/parent`,
    ];
  }

  if (
    hasRoleInSchool(session, subdomain, "owner") ||
    hasRoleInSchool(session, subdomain, "admin")
  ) {
    routes.push(`/${subdomain}/admin`);
  }

  if (hasRoleInSchool(session, subdomain, "teacher")) {
    routes.push(`/${subdomain}/teacher`);
  }

  if (hasRoleInSchool(session, subdomain, "student")) {
    routes.push(`/${subdomain}/student`);
  }

  if (hasRoleInSchool(session, subdomain, "accountant")) {
    routes.push(`/${subdomain}/accountant`);
  }

  if (hasRoleInSchool(session, subdomain, "staff")) {
    routes.push(`/${subdomain}/staff`);
  }

  if (hasRoleInSchool(session, subdomain, "guardian")) {
    routes.push(`/${subdomain}/parent`);
  }

  return routes;
}
