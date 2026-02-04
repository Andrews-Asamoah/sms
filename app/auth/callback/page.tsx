// app/auth/callback/page.tsx - REFACTORED

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getDefaultRoute } from "@/lib/auth/route-resolver";
import { headers } from "next/headers";

interface CallbackPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

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

  // Get session using consolidated session module
  const session = await getSession();

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

// ============================================================================
// METADATA
// ============================================================================

export function generateMetadata() {
  return {
    title: "Signing in...",
    description: "Completing authentication process",
  };
}
