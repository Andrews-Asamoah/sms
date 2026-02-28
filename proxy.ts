// proxy.ts - Next.js 16
import { type NextRequest, NextResponse } from "next/server";

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  "/auth/login",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
  "/auth/invite",
  "/auth/callback",
  "/api/auth",
  "/unauthorized",
] as const;

// API routes that bypass proxy
const API_ROUTES_BYPASS = ["/api/auth", "/api/health"] as const;

// Static assets and Next.js internals
const BYPASS_PATTERNS = [
  "/_next",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
] as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if route is public
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Check if route should bypass proxy
 */
function shouldBypass(pathname: string): boolean {
  // Bypass static assets
  if (BYPASS_PATTERNS.some((pattern) => pathname.startsWith(pattern))) {
    return true;
  }

  // Bypass API routes
  if (API_ROUTES_BYPASS.some((route) => pathname.startsWith(route))) {
    return true;
  }

  return false;
}

/**
 * Check if user has valid session cookie
 */
function hasSessionCookie(request: NextRequest): boolean {
  // Better Auth uses a cookie named "better-auth.session_token"
  const sessionCookie = request.cookies.get("better-auth.session_token");
  return !!sessionCookie?.value;
}

/**
 * Extract subdomain from request
 */
function getSubdomain(request: NextRequest): string | null {
  const hostname = request.headers.get("host") || "";

  // In development: localhost:3000
  if (hostname.includes("localhost")) {
    return null;
  }

  // In production: subdomain.yourdomain.com
  const parts = hostname.split(".");
  if (parts.length >= 3) {
    return parts[0];
  }

  return null;
}

// ============================================================================
// MAIN PROXY HANDLER
// ============================================================================

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Bypass static assets and certain API routes
  if (shouldBypass(pathname)) {
    return NextResponse.next();
  }

  // 2. Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // 3. Check authentication for protected routes
  const hasSession = hasSessionCookie(request);

  if (!hasSession) {
    // Redirect to login with callback URL
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Handle subdomain-based routing (optional)
  const subdomain = getSubdomain(request);
  if (subdomain && pathname === "/") {
    // Redirect root of subdomain to its role-based root
    const rootUrl = new URL(`/${subdomain}`, request.url);
    return NextResponse.redirect(rootUrl);
  }

  // ============================================================================
  // 5. ADD PATHNAME TO HEADERS (for role detection in server components)
  // ============================================================================

  // Clone request headers
  const requestHeaders = new Headers(request.headers);

  // Add pathname to headers so server components can access it
  // This is crucial for role switching to work correctly
  requestHeaders.set("x-pathname", pathname);

  // Add search params if they exist (useful for debugging)
  if (request.nextUrl.search) {
    requestHeaders.set("x-search-params", request.nextUrl.search);
  }

  // Continue to route with modified headers
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// ============================================================================
// PROXY CONFIGURATION
// ============================================================================

export const config = {
  // Match all routes except static files
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)"],
};
