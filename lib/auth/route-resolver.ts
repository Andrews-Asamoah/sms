// lib/auth/route-resolver.ts
import type { ExtendedSession, EffectiveRole, ProfileRoleType } from "./types";
import { getPrimarySchool, hasRoleInSchool } from "./school-access";

export function getDefaultRoute(session: ExtendedSession): string {
  // Super Admin goes to / (system dashboard)
  if (session.isSuperAdmin) {
    return "/";
  }

  const primarySchool = getPrimarySchool(session);

  if (!primarySchool) {
    return "/no-access";
  }

  const { subdomain, effectiveRole } = primarySchool;

  // Routes for school users (not super admin)
  switch (effectiveRole) {
    case "owner":
    case "admin":
    case "headteacher":
      return `/${subdomain}/admin`;

    case "teacher":
      return `/${subdomain}/teacher`;

    case "accountant":
      return `/${subdomain}/accountant`;

    case "staff":
      return `/${subdomain}/staff`;

    case "student":
      return `/${subdomain}/student`;

    case "guardian":
      return `/${subdomain}/guardian`;

    default:
      return "/no-access";
  }
}

export function canAccessRoute(
  session: ExtendedSession,
  path: string,
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
    admin: ["owner", "admin", "headteacher"],
    teacher: ["teacher", "owner", "admin", "headteacher"],
    student: ["student", "owner", "admin", "headteacher"],
    staff: ["staff", "owner", "admin", "headteacher"],
    accountant: ["accountant", "owner", "admin", "headteacher"],
    guardian: ["guardian", "owner", "admin", "headteacher"],
  };

  const requiredRoles = roleRequirements[routeRole];
  if (!requiredRoles) return false;

  return requiredRoles.some((role) =>
    hasRoleInSchool(
      session,
      subdomain,
      role as EffectiveRole | ProfileRoleType,
    ),
  );
}

export function getAccessibleRoutes(
  session: ExtendedSession,
  subdomain: string,
): string[] {
  const routes: string[] = [];

  if (session.isSuperAdmin) {
    return [
      `/${subdomain}/admin`,
      `/${subdomain}/teacher`,
      `/${subdomain}/student`,
      `/${subdomain}/staff`,
      `/${subdomain}/accountant`,
      `/${subdomain}/guardian`,
    ];
  }

  if (
    hasRoleInSchool(session, subdomain, "owner") ||
    hasRoleInSchool(session, subdomain, "admin") ||
    hasRoleInSchool(session, subdomain, "headteacher")
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
    routes.push(`/${subdomain}/guardian`);
  }

  return routes;
}
