// app/auth/callback/page.tsx - REFACTORED

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getDefaultRoute } from "@/lib/auth/route-resolver";
import { headers } from "next/headers";

interface CallbackPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export const dynamic = "force-dynamic";

export default async function CallbackPage({
  searchParams,
}: CallbackPageProps) {
  // Await searchParams
  const params = await searchParams;

  // Force headers to be consumed (helps with caching)
  await headers();

  // Get session using consolidated session module
  const session = await getSession();

  if (!session) {
    const returnUrl = params.callbackUrl || "/";
    redirect(`/auth/login?callbackUrl=${encodeURIComponent(returnUrl)}`);
  }

  // If there's a specific callback URL, validate and use it
  if (params.callbackUrl) {
    const decodedUrl = decodeURIComponent(params.callbackUrl);

    // Security: ensure it's a relative URL
    if (decodedUrl.startsWith("/") && !decodedUrl.startsWith("//")) {
      redirect(decodedUrl);
    }
  }

  // Determine default route based on role and memberships
  const defaultRoute = getDefaultRoute(session);
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
