// app/api/schools/route.ts - For listing and creating schools
import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET - List all schools
export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session || session.user.role !== "superAdmin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const schools = await prisma.school.findMany({
      include: {
        subscription: true,
        organization: true,
        _count: {
          select: {
            students: true,
            teachers: true,
            staff: true,
            classes: true,
            departments: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(schools);
  } catch (error) {
    console.error("Error fetching schools:", error);
    return NextResponse.json(
      { error: "Failed to fetch schools" },
      { status: 500 }
    );
  }
}

// POST - Create new school
export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session || session.user.role !== "superAdmin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      code,
      subdomain,
      email,
      phone,
      address,
      motto,
      website,
      currency,
      timezone,
      locale,
      primaryColor,
      secondaryColor,
    } = body;

    // Use a transaction to ensure all operations succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      // Step 1: Create organization
      const organization = await tx.organization.create({
        data: {
          name,
          slug: subdomain,
        },
      });

      // Step 2: Create the school
      const school = await tx.school.create({
        data: {
          organizationId: organization.id,
          name,
          code,
          subdomain,
          email: email || null,
          phone: phone || null,
          address: address || null,
          motto: motto || null,
          website: website || null,
          currency: currency || "GHS",
          timezone: timezone || "Africa/Accra",
          locale: locale || "en-GH",
          primaryColor: primaryColor || "#3B82F6",
          secondaryColor: secondaryColor || "#10B981",
        },
      });

      // Step 3: Create default FREE subscription for the school
      await tx.subscription.create({
        data: {
          schoolId: school.id,
          planType: "FREE",
          planName: "Free Plan",
          status: "ACTIVE",
          currency: "USD",
          isOnTrial: true,
          trialStartsAt: new Date(),
          trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          maxStudents: 50,
          maxTeachers: 10,
          maxStaff: 5,
        },
      });

      // Step 4: Add the creator as owner
      await tx.member.create({
        data: {
          organizationId: organization.id,
          userId: session.user.id,
          role: "OWNER",
        },
      });

      return school;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating school:", error);

    if (error instanceof Error) {
      if (
        error.message.includes("Unique constraint") ||
        error.message.includes("unique")
      ) {
        return NextResponse.json(
          { error: "School code or subdomain already exists" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to create school" },
      { status: 500 }
    );
  }
}
