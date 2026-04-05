// app/api/schools/[schoolSlug]/subscription/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { getDefaultLimitsForPlan } from "@/lib/subscription/limits";

type RouteContext = {
  params: Promise<{ schoolSlug: string }>;
};

// ============================================================================
// GET — fetch subscription details (SuperAdmin only)
// ============================================================================

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session?.isSuperAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { schoolSlug } = await context.params;

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      include: {
        subscription: {
          include: {
            invoices: {
              orderBy: { createdAt: "desc" },
              take: 20,
            },
          },
        },
        organization: {
          select: { name: true, slug: true },
        },
        _count: {
          select: { students: true, teachers: true, staff: true },
        },
      },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    return NextResponse.json(school);
  } catch (error) {
    console.error("[Subscription GET] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================================================
// PATCH — SuperAdmin manual subscription update
// ============================================================================

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session?.isSuperAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { schoolSlug } = await context.params;
    const body = await request.json();

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true, organizationId: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const {
      planType,
      planName,
      status,
      billingCycle,
      amount,
      currency,
      currentPeriodStart,
      currentPeriodEnd,
      maxStudents,
      maxTeachers,
      maxStaff,
      isOnTrial,
      trialEndsAt,
    } = body;

    const updateData: Record<string, unknown> = {};

    if (planType !== undefined) updateData.planType = planType;
    if (planName !== undefined) updateData.planName = planName;
    if (status !== undefined) updateData.status = status;
    if (billingCycle !== undefined) updateData.billingCycle = billingCycle;
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (currency !== undefined) updateData.currency = currency;
    if (currentPeriodStart !== undefined)
      updateData.currentPeriodStart = new Date(currentPeriodStart);
    if (currentPeriodEnd !== undefined)
      updateData.currentPeriodEnd = new Date(currentPeriodEnd);
    if (isOnTrial !== undefined) updateData.isOnTrial = isOnTrial;
    if (trialEndsAt !== undefined)
      updateData.trialEndsAt = trialEndsAt ? new Date(trialEndsAt) : null;

    // ── Limit resolution ──────────────────────────────────────────────────────
    //
    // Priority:
    //   1. Explicit values from the request (admin used Manual Override toggle)
    //   2. Auto-derived from planType when planType changed without override
    //   3. Leave unchanged (neither planType nor limits were sent)
    //
    // This prevents the bug where changing planType to PREMIUM via the edit
    // form without enabling Manual Override left stale limits (e.g. maxStudents
    // = 50 from Free plan), blocking student creation on a premium school.
    //
    const explicitLimits =
      maxStudents !== undefined ||
      maxTeachers !== undefined ||
      maxStaff !== undefined;

    if (explicitLimits) {
      // Admin explicitly set limits — empty string / null → null (unlimited).
      if (maxStudents !== undefined)
        updateData.maxStudents =
          maxStudents === "" || maxStudents === null
            ? null
            : parseInt(maxStudents);
      if (maxTeachers !== undefined)
        updateData.maxTeachers =
          maxTeachers === "" || maxTeachers === null
            ? null
            : parseInt(maxTeachers);
      if (maxStaff !== undefined)
        updateData.maxStaff =
          maxStaff === "" || maxStaff === null ? null : parseInt(maxStaff);
    } else if (planType !== undefined) {
      // Plan type changed without explicit limits → auto-derive.
      // getDefaultLimitsForPlan("PREMIUM") returns null (unlimited) for all.
      const derived = getDefaultLimitsForPlan(planType);
      updateData.maxStudents = derived.students;
      updateData.maxTeachers = derived.teachers;
      updateData.maxStaff = derived.staff;
    }

    // ── "Grant Premium" shortcut ──────────────────────────────────────────────
    //
    // When planType is PREMIUM and no billing period is provided, treat this
    // as a manual grant. Set a 6-month period and clear all trial/cancellation
    // flags. Limits are already set to null (unlimited) via getDefaultLimitsForPlan
    // in the block above.
    //
    if (planType === "PREMIUM" && !body.currentPeriodStart) {
      updateData.currentPeriodStart = new Date();
      if (!body.currentPeriodEnd) {
        const end = new Date();
        end.setMonth(end.getMonth() + 6);
        updateData.currentPeriodEnd = end;
      }
      updateData.status = status ?? "ACTIVE";
      updateData.isOnTrial = false;
      updateData.trialStartsAt = null;
      updateData.trialEndsAt = null;
      updateData.cancelAtPeriodEnd = false;
      updateData.canceledAt = null;
    }

    const subscription = await prisma.subscription.upsert({
      where: { schoolId: school.id },
      create: {
        schoolId: school.id,
        planType: planType ?? "FREE",
        planName: planName ?? "Free Plan",
        status: status ?? "ACTIVE",
        billingCycle: billingCycle ?? null,
        amount: amount ? parseFloat(amount) : null,
        currency: currency ?? "GHS",
        ...updateData,
      },
      update: updateData,
    });

    // Keep organization subscriptionStatus in sync.
    await prisma.organization.update({
      where: { id: school.organizationId },
      data: {
        subscriptionStatus: (subscription.status as string) ?? "ACTIVE",
        expiresAt: subscription.currentPeriodEnd ?? null,
      },
    });

    return NextResponse.json(subscription);
  } catch (error) {
    console.error("[Subscription PATCH] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
