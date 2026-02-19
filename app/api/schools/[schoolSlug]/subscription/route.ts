// app/api/schools/[schoolSlug]/subscription/route.ts - Consolidated subscription management
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import prisma from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ schoolSlug: string }>;
};

// GET subscription details for a school
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
          select: {
            students: true,
            teachers: true,
            staff: true,
          },
        },
      },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    return NextResponse.json(school);
  } catch (error) {
    console.error("Error fetching school subscription:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// PATCH - SuperAdmin manual subscription update
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session?.isSuperAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { schoolSlug } = await context.params;
    const body = await request.json();

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

    // Validate the school exists and get ID
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const schoolId = school.id;

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
    if (maxStudents !== undefined)
      updateData.maxStudents = maxStudents ? parseInt(maxStudents) : null;
    if (maxTeachers !== undefined)
      updateData.maxTeachers = maxTeachers ? parseInt(maxTeachers) : null;
    if (maxStaff !== undefined)
      updateData.maxStaff = maxStaff ? parseInt(maxStaff) : null;
    if (isOnTrial !== undefined) updateData.isOnTrial = isOnTrial;
    if (trialEndsAt !== undefined)
      updateData.trialEndsAt = trialEndsAt ? new Date(trialEndsAt) : null;

    // Handle "Grant Premium" shortcut
    if (planType === "PREMIUM" && !body.currentPeriodStart) {
      updateData.currentPeriodStart = new Date();
      if (!body.currentPeriodEnd) {
        const end = new Date();
        end.setFullYear(end.getFullYear() + 1);
        updateData.currentPeriodEnd = end;
      }
      updateData.isOnTrial = false;
      updateData.trialStartsAt = null;
      updateData.trialEndsAt = null;
      updateData.cancelAtPeriodEnd = false;
      updateData.canceledAt = null;
    }

    const subscription = await prisma.subscription.upsert({
      where: { schoolId },
      create: {
        schoolId,
        planType: planType || "FREE",
        planName: (planName as string) || "Free Plan",
        status: status || "ACTIVE",
        billingCycle: billingCycle || null,
        amount: amount ? parseFloat(amount) : null,
        currency: (currency as string) || "GHS",
        ...updateData,
      },
      update: updateData,
    });

    return NextResponse.json(subscription);
  } catch (error) {
    console.error("Error updating subscription:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
