// app/auth/callback/page.tsx
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { headers } from "next/headers";

interface CallbackPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

/**
 * Auth Callback Handler
 *
 * Processes authentication callbacks and redirects users to appropriate routes
 * based on their role and memberships.
 */
export default async function CallbackPage({
  searchParams,
}: CallbackPageProps) {
  console.log("[Callback] 🔄 Processing auth callback...");

  // Await searchParams
  const params = await searchParams;
  console.log(`[Callback] Callback URL: ${params.callbackUrl || "none"}`);

  // Force headers to be consumed (helps with caching)
  await headers();

  // Give Better Auth time to fully establish session
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Get session using Better Auth's getAuthSession
  const session = await getAuthSession();

  if (!session) {
    console.log("[Callback] ❌ No session found after auth");
    const returnUrl = params.callbackUrl || "/";
    redirect(`/auth/login?callbackUrl=${encodeURIComponent(returnUrl)}`);
  }

  console.log(`[Callback] ✅ Session loaded for: ${session.user.email}`);
  console.log(`[Callback] Is SuperAdmin: ${session.isSuperAdmin}`);
  console.log(`[Callback] Memberships: ${session.memberships.length}`);
  console.log(`[Callback] Has Profile: ${!!session.profile}`);

  // If there's a specific callback URL, validate and use it
  if (params.callbackUrl) {
    const decodedUrl = decodeURIComponent(params.callbackUrl);
    console.log(`[Callback] ➡️ Redirecting to callback: ${decodedUrl}`);

    // Security: ensure it's a relative URL
    if (decodedUrl.startsWith("/") && !decodedUrl.startsWith("//")) {
      redirect(decodedUrl);
    }
  }

  // Determine default route based on role and memberships
  const defaultRoute = getDefaultRoute(session);
  console.log(`[Callback] ➡️ Redirecting to default: ${defaultRoute}`);

  redirect(defaultRoute);
}

/**
 * Determine default route for authenticated user
 */
function getDefaultRoute(
  session: NonNullable<Awaited<ReturnType<typeof getAuthSession>>>,
) {
  // SuperAdmin → SuperAdmin dashboard
  if (session.isSuperAdmin) {
    return "/dashboard";
  }

  // User with memberships → first school's dashboard
  if (session.memberships.length > 0) {
    const firstSchool = session.memberships[0].organization.school;
    if (firstSchool?.subdomain) {
      return `/${firstSchool.subdomain}/dashboard`;
    }
  }

  // User with profile roles → appropriate dashboard
  if (session.profile) {
    // Student
    if (session.profile.student?.school?.subdomain) {
      return `/${session.profile.student.school.subdomain}/dashboard`;
    }

    // Teacher
    if (session.profile.teacher?.school?.subdomain) {
      return `/${session.profile.teacher.school.subdomain}/dashboard`;
    }

    // Guardian
    if (session.profile.guardian?.school?.subdomain) {
      return `/${session.profile.guardian.school.subdomain}/dashboard`;
    }

    // Staff
    if (session.profile.staff?.school?.subdomain) {
      return `/${session.profile.staff.school.subdomain}/dashboard`;
    }
  }

  // Fallback → account setup or general dashboard
  return "/account/setup";
}

// Show a loading state while processing
export function generateMetadata() {
  return {
    title: "Signing in...",
  };
}
