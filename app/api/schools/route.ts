// app/api/schools/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

// GET - List all schools (Super Admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !session.isSuperAdmin) {
      return NextResponse.json(
        { error: "Unauthorized. Super Admin access required." },
        { status: 403 },
      );
    }

    const schools = await prisma.school.findMany({
      include: {
        subscription: true,
        organization: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            students: true,
            teachers: true,
            staff: true,
            classes: true,
            departments: true,
            academicYears: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: schools,
      count: schools.length,
    });
  } catch (error) {
    console.error("[SCHOOLS_GET] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch schools",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// POST - Create new school using Better Auth organization
export async function POST(request: NextRequest) {
  let organizationResponse: { id: string; name: string; slug: string } | null =
    null;

  try {
    console.log("[SCHOOLS_POST] Starting school creation process");

    const session = await getSession();

    // Only superAdmins can create schools
    if (!session || !session.isSuperAdmin) {
      console.error(
        "[SCHOOLS_POST] Unauthorized attempt:",
        session?.user?.email,
      );
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized. Super Admin access required to create schools.",
        },
        { status: 403 },
      );
    }

    console.log("[SCHOOLS_POST] Authorized user:", session.user.email);

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

    console.log("[SCHOOLS_POST] Request data:", { name, code, subdomain });

    // Validate required fields
    if (!name || !code || !subdomain) {
      console.error("[SCHOOLS_POST] Missing required fields");
      return NextResponse.json(
        {
          success: false,
          error: "Name, code, and subdomain are required",
          fields: { name: !name, code: !code, subdomain: !subdomain },
        },
        { status: 400 },
      );
    }

    // Validate subdomain format
    const subdomainRegex = /^[a-z0-9-]+$/;
    if (!subdomainRegex.test(subdomain)) {
      console.error("[SCHOOLS_POST] Invalid subdomain format:", subdomain);
      return NextResponse.json(
        {
          success: false,
          error:
            "Subdomain must contain only lowercase letters, numbers, and hyphens",
        },
        { status: 400 },
      );
    }

    console.log("[SCHOOLS_POST] Checking for existing school...");

    // Check if code or subdomain already exists in School table
    const existingSchool = await prisma.school.findFirst({
      where: {
        OR: [
          { code: code.toUpperCase() },
          { subdomain: subdomain.toLowerCase() },
        ],
      },
    });

    if (existingSchool) {
      const conflict =
        existingSchool.code === code.toUpperCase() ? "code" : "subdomain";
      console.error(
        "[SCHOOLS_POST] School already exists:",
        conflict,
        existingSchool.name,
      );
      return NextResponse.json(
        {
          success: false,
          error: `School ${conflict} already exists`,
          conflict,
          existing: {
            name: existingSchool.name,
            [conflict]: existingSchool[conflict],
          },
        },
        { status: 409 },
      );
    }

    // Check if organization slug already exists in Organization table
    const existingOrg = await prisma.organization.findUnique({
      where: { slug: subdomain.toLowerCase() },
    });

    if (existingOrg) {
      console.error(
        "[SCHOOLS_POST] Organization already exists:",
        existingOrg.name,
      );
      return NextResponse.json(
        {
          success: false,
          error: "Organization subdomain already exists",
          conflict: "subdomain",
          existing: {
            name: existingOrg.name,
            slug: existingOrg.slug,
          },
        },
        { status: 409 },
      );
    }

    console.log("[SCHOOLS_POST] Creating organization via Better Auth...");

    // Create organization via Better Auth
    const orgResponse = await auth.api.createOrganization({
      body: {
        name,
        slug: subdomain.toLowerCase(),
        userId: session.user.id,
      },
      headers: request.headers,
    });

    if (!orgResponse) {
      throw new Error("Failed to create organization via Better Auth");
    }

    // Store the response for potential cleanup
    organizationResponse = orgResponse;

    console.log("[SCHOOLS_POST] Organization created:", orgResponse.id);

    // Create school and subscription in transaction
    console.log("[SCHOOLS_POST] Starting transaction for school creation...");

    const result = await prisma.$transaction(async (tx) => {
      console.log("[SCHOOLS_POST] Updating organization metadata...");

      // Update organization metadata
      await tx.organization.update({
        where: { id: orgResponse.id },
        data: {
          metadata: JSON.stringify({
            schoolCode: code.toUpperCase(),
            createdBy: session.user.id,
            createdAt: new Date().toISOString(),
          }),
        },
      });

      console.log("[SCHOOLS_POST] Creating school record...");

      // Create the school
      const school = await tx.school.create({
        data: {
          organizationId: orgResponse.id,
          name,
          code: code.toUpperCase(),
          subdomain: subdomain.toLowerCase(),
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
          settings: {
            emailNotifications: true,
            smsNotifications: false,
            autoGenerateIds: true,
          },
          features: {
            attendance: true,
            grading: true,
            billing: true,
            library: false,
            transport: false,
            hostel: false,
          },
        },
      });

      console.log("[SCHOOLS_POST] School created:", school.id);
      console.log("[SCHOOLS_POST] Creating subscription...");

      // Create FREE subscription
      const subscription = await tx.subscription.create({
        data: {
          schoolId: school.id,
          planType: "FREE",
          planName: "Free Plan",
          status: "ACTIVE",
          currency: "USD",
          isOnTrial: false,
          trialStartsAt: null,
          trialEndsAt: null,
          maxStudents: 50,
          maxTeachers: 10,
          maxStaff: 5,
        },
      });

      console.log("[SCHOOLS_POST] Subscription created:", subscription.id);
      console.log("[SCHOOLS_POST] Creating audit log...");

      // Log the school creation
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "CREATE",
          entityType: "SCHOOL",
          entityId: school.id,
          newValues: {
            name: school.name,
            code: school.code,
            subdomain: school.subdomain,
            organizationId: orgResponse.id,
          },
        },
      });

      console.log("[SCHOOLS_POST] Audit log created");

      return { school, subscription, organization: orgResponse };
    });

    console.log("[SCHOOLS_POST] Transaction completed successfully");
    console.log("[SCHOOLS_POST] Fetching complete school data...");

    // Fetch the complete school data
    const schoolWithDetails = await prisma.school.findUnique({
      where: { id: result.school.id },
      include: {
        organization: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                  },
                },
              },
            },
          },
        },
        subscription: true,
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
    });

    console.log("[SCHOOLS_POST] School creation completed successfully!");

    return NextResponse.json(
      {
        success: true,
        data: schoolWithDetails,
        message: `School "${name}" created successfully`,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[SCHOOLS_POST] ❌ Error occurred:", error);
    console.error("[SCHOOLS_POST] Error details:", {
      message: error instanceof Error ? error.message : "Unknown",
      stack: error instanceof Error ? error.stack : undefined,
    });

    // CRITICAL: Cleanup orphaned organization if it was created
    if (organizationResponse?.id) {
      console.log(
        "[SCHOOLS_POST] 🧹 Attempting to cleanup orphaned organization:",
        organizationResponse.id,
      );

      try {
        await prisma.$transaction(async (tx) => {
          // Delete members
          const deletedMembers = await tx.member.deleteMany({
            where: { organizationId: organizationResponse!.id },
          });
          console.log("[SCHOOLS_POST] Deleted members:", deletedMembers.count);

          // Delete invitations
          const deletedInvitations = await tx.invitation.deleteMany({
            where: { organizationId: organizationResponse!.id },
          });
          console.log(
            "[SCHOOLS_POST] Deleted invitations:",
            deletedInvitations.count,
          );

          // Delete organization
          await tx.organization.delete({
            where: { id: organizationResponse!.id },
          });
          console.log(
            "[SCHOOLS_POST] Deleted organization:",
            organizationResponse!.id,
          );
        });

        console.log(
          "[SCHOOLS_POST] ✅ Successfully cleaned up orphaned organization",
        );
      } catch (cleanupError) {
        console.error(
          "[SCHOOLS_POST] ❌ CRITICAL: Failed to cleanup organization:",
          cleanupError,
        );
        console.error(
          "[SCHOOLS_POST] Manual cleanup required for organization:",
          organizationResponse.id,
        );
        // Don't throw - we still want to return the original error
      }
    }

    // Handle specific errors
    if (error instanceof Error) {
      // Better Auth permission errors
      if (error.message.includes("not allowed to create organization")) {
        return NextResponse.json(
          {
            success: false,
            error: "You don't have permission to create organizations",
            details: "Only Super Admins can create schools",
          },
          { status: 403 },
        );
      }

      // Unique constraint violations
      if (
        error.message.includes("Unique constraint") ||
        error.message.includes("unique") ||
        error.message.includes("already exists")
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "School code or subdomain already exists",
            details: error.message,
          },
          { status: 409 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create school",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
