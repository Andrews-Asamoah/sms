import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Cookie TTL: refresh the status check every 5 minutes
const STATUS_CACHE_TTL_SECONDS = 5 * 60;

function getStatusCookieName(schoolSlug: string) {
  return `sms_sub_${schoolSlug}`;
}

/**
 * Global Proxy for Subscription Enforcement (Next.js 16+)
 *
 * Performance strategy:
 * - Cache subscription status in a short-lived cookie (5 min TTL)
 * - Active schools: zero DB lookups after first request → fast path
 * - Suspended/expired: get session + re-verify on every check cycle
 * - No layout shifts: all enforcement happens server-side before render
 */
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip API routes, static assets, and root
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  // 2. Extract school slug
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 1) return NextResponse.next();

  const schoolSlug = parts[0];

  // 3. Skip reserved top-level paths
  const reservedPaths = ["auth", "system", "unauthorized", "no-access"];
  if (reservedPaths.includes(schoolSlug)) return NextResponse.next();

  try {
    // 4. ⚡ Fast path: check the cookie cache first
    // For active schools this avoids ALL DB queries on every request
    const cookieName = getStatusCookieName(schoolSlug);
    const cachedStatus = request.cookies.get(cookieName)?.value;

    if (cachedStatus === "ACTIVE") {
      // School is active and we verified it recently — pass through immediately
      return NextResponse.next();
    }

    // 5. Cache miss or non-active — do a single, lightweight DB lookup
    // Only fetches 2 fields from the organization table (indexed by subdomain)
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: {
        organization: {
          select: {
            id: true,
            subscriptionStatus: true,
          },
        },
      },
    });

    const subscriptionStatus = school?.organization?.subscriptionStatus;
    const orgId = school?.organization?.id;

    // 6. Build the response and set/refresh the status cookie
    // This means subsequent requests within 5 min skip the DB entirely
    const response = NextResponse.next();
    if (subscriptionStatus) {
      response.cookies.set(cookieName, subscriptionStatus, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: STATUS_CACHE_TTL_SECONDS,
        secure: process.env.NODE_ENV === "production",
      });
    }

    // 7. If ACTIVE or TRIALING (or unknown school), let through
    if (
      !subscriptionStatus ||
      subscriptionStatus === "ACTIVE" ||
      subscriptionStatus === "TRIALING"
    ) {
      return response;
    }

    // 8. School has a non-active status — determine what the user can access.
    //    PAST_DUE  → soft block: redirect admins/owners to billing to re-pay,
    //                everyone else sees the suspended notice.
    //    All other blocked statuses (SUSPENDED, EXPIRED, CANCELED, UNPAID,
    //    INCOMPLETE_EXPIRED) → hard block: billing page for admins, suspended
    //    notice for everyone else.
    //
    // We only call getSession() here so unauthenticated/active-school requests
    // never pay the session-lookup cost.
    const isPastDue = subscriptionStatus === "PAST_DUE";
    const isBillingPage =
      pathname.includes("/admin/subscription") ||
      pathname.includes("/admin/billing");
    const isSuspendedPage = pathname.endsWith("/suspended");

    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      if (isPastDue) {
        // Unauthenticated users on a past-due school → suspended page
        if (!isSuspendedPage) {
          return NextResponse.redirect(
            new URL(`/${schoolSlug}/suspended`, request.url)
          );
        }
        return response;
      }
      if (!isSuspendedPage) {
        return NextResponse.redirect(
          new URL(`/${schoolSlug}/suspended`, request.url)
        );
      }
      return response;
    }

    const memberRole = (session.user.role ?? "") as string;
    const isSuperAdmin = memberRole === "superAdmin";

    // 9. Check if this user is an admin/owner of the specific org.
    // Only fires for non-active schools — a rare edge case.
    let isOrgAdminOrOwner = false;
    if (!isSuperAdmin && orgId && session.session.activeOrganizationId === orgId) {
      const member = await prisma.member.findFirst({
        where: {
          userId: session.user.id,
          organizationId: orgId,
          role: { in: ["owner", "admin"] },
        },
        select: { id: true },
      });
      isOrgAdminOrOwner = !!member;
    }

    const canAccessBilling = isSuperAdmin || isOrgAdminOrOwner;

    if (canAccessBilling) {
      // Admins/owners → billing page only
      if (!isBillingPage && !isSuspendedPage) {
        return NextResponse.redirect(
          new URL(`/${schoolSlug}/admin/subscription`, request.url)
        );
      }
    } else {
      // Everyone else → suspension notice
      if (!isSuspendedPage) {
        return NextResponse.redirect(
          new URL(`/${schoolSlug}/suspended`, request.url)
        );
      }
    }

    return response;
  } catch (error) {
    // Fail open — never block legitimate users due to a proxy error
    console.error("[Proxy] Subscription check failed:", error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
