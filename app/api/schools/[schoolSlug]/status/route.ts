import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasSchoolAccess } from "@/lib/auth/school-access";

/**
 * Internal API to check school/organization status.
 * Used by proxy.ts and cron jobs.
 *
 * Auth requirements (either one must be satisfied):
 *   1. Request carries the CRON_SECRET in the Authorization header → allowed for
 *      server-side internal callers (cron jobs, proxy) with no user session.
 *   2. Request has a valid user session AND the user is a member of this school
 *      → allowed for school admins polling their own status.
 *
 * Anyone else receives 401.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ schoolSlug: string }> }
) {
  const { schoolSlug } = await params;

  // ── 1. Internal caller check (cron / server-to-server) ─────────────────────
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const isInternalCaller =
    cronSecret && authHeader === `Bearer ${cronSecret}`;

  // ── 2. Session-based check (school admin polling own status) ───────────────
  if (!isInternalCaller) {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperAdmin = session.isSuperAdmin;
    const hasMembership = hasSchoolAccess(session, schoolSlug);

    if (!isSuperAdmin && !hasMembership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: {
        organization: {
          select: {
            id: true,
            subscriptionStatus: true,
            expiresAt: true,
          },
        },
      },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: school.organization.id,
      subscriptionStatus: school.organization.subscriptionStatus,
      expiresAt: school.organization.expiresAt,
    });
  } catch (error) {
    console.error("[Status] Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
