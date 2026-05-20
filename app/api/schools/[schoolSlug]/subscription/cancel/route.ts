import { verifyApiSchoolAccess } from "@/lib/auth/guards";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ schoolSlug: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { schoolSlug } = await context.params;
    const access = await verifyApiSchoolAccess(schoolSlug, ["owner", "admin"]);
    if (!access.authorized) return access.errorResponse;
    const { session } = access;


    // Always resolve by subdomain — the route param is always the slug.
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: {
        id: true,
        organizationId: true,
        subscription: {
          select: {
            id: true,
            status: true,
            paystackSubscriptionCode: true,
            currentPeriodEnd: true,
          },
        },
        organization: {
          select: {
            members: {
              where: { userId: session.user.id },
              select: { role: true },
            },
          },
        },
      },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const isSuperAdmin = session.user.role === "superAdmin";
    const isOwnerOrAdmin = school.organization.members.some(
      (m) => m.role === "owner" || m.role === "admin",
    );

    if (!isSuperAdmin && !isOwnerOrAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!school.subscription) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 400 },
      );
    }

    // ── Attempt to disable the Paystack recurring subscription ───────────────
    //
    // Paystack's POST /subscription/disable endpoint accepts just { code }
    // for server-side calls. The "token" field in the documentation refers
    // to the one-time email token sent to the customer for the self-service
    // unsubscribe link — it is NOT required for server-initiated cancellations.
    //
    const paystackCode = school.subscription.paystackSubscriptionCode;
    if (paystackCode && process.env.PAYSTACK_SECRET_KEY) {
      try {
        const paystackResponse = await fetch(
          "https://api.paystack.co/subscription/disable",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ code: paystackCode }),
          },
        );

        if (!paystackResponse.ok) {
          // Log but don't block — we still cancel locally.
          const err = await paystackResponse.json().catch(() => ({}));
          console.warn(
            "[Cancel] Paystack disable failed — proceeding with local cancel:",
            err,
          );
        }
      } catch (e) {
        console.warn("[Cancel] Paystack disable request failed:", e);
      }
    }

    // ── Update local subscription record ─────────────────────────────────────
    //
    // We use the "cancel at period end" pattern — the subscription stays
    // ACTIVE (and the school retains access) until currentPeriodEnd, at which
    // point the lifecycle checker in lib/subscription/lifecycle.ts transitions
    // it to EXPIRED. This mirrors how Stripe and Paystack handle cancellations.
    //
    // We do NOT immediately set status: "CANCELED" because:
    //   1. The school has paid for the remaining period — they should keep access.
    //   2. The lifecycle checker only handles ACTIVE/PAST_DUE → EXPIRED,
    //      so an immediate CANCELED status would never auto-expire correctly.
    //
    const subscription = await prisma.subscription.update({
      where: { schoolId: school.id },
      data: {
        cancelAtPeriodEnd: true,
        canceledAt: new Date(),
        // Keep status ACTIVE — access continues until currentPeriodEnd.
        // The lifecycle checker will transition to EXPIRED at period end.
      },
    });

    return NextResponse.json({
      success: true,
      message: `Subscription cancelled. Access continues until ${
        school.subscription.currentPeriodEnd
          ? new Date(school.subscription.currentPeriodEnd).toLocaleDateString(
              "en-US",
              { month: "long", day: "numeric", year: "numeric" },
            )
          : "the end of the billing period"
      }.`,
      subscription,
    });
  } catch (error) {
    console.error("[Cancel] Error:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 },
    );
  }
}
