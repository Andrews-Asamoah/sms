// app/auth/callback/page.tsx
import { redirect } from "next/navigation";
import { getEnhancedSession } from "@/lib/auth/session";
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

  const session = await getEnhancedSession();

  if (!session) {
    console.log("[Callback] ❌ No session found after auth");
    const returnUrl = params.callbackUrl || "/";
    redirect(`/auth/login?callbackUrl=${encodeURIComponent(returnUrl)}`);
  }

  console.log(`[Callback] ✅ Session loaded for: ${session.user.email}`);
  console.log(`[Callback] Is Super Admin: ${session.isSuperAdmin}`);
  console.log(`[Callback] Memberships: ${session.memberships.length}`);
  console.log(`[Callback] Has Profile: ${!!session.profile}`);

  // If there's a specific callback URL, validate and use it
  if (params.callbackUrl) {
    const decodedUrl = decodeURIComponent(params.callbackUrl);
    console.log(`[Callback] ➡️ Redirecting to: ${decodedUrl}`);

    // Security: ensure it's a relative URL
    if (decodedUrl.startsWith("/") && !decodedUrl.startsWith("//")) {
      redirect(decodedUrl);
    }
  }

  // Determine default route based on role
  const defaultRoute = getDefaultRoute(session);
  console.log(`[Callback] ➡️ Redirecting to default: ${defaultRoute}`);

  redirect(defaultRoute);
}

// Show a loading state while processing
export function generateMetadata() {
  return {
    title: "Signing in...",
  };
}
