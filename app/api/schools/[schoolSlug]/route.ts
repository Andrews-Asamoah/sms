// app/api/schools/[schoolId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";

type RouteContext = {
  params: Promise<{
    schoolSlug: string;
  }>;
};

// GET - Fetch single school
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params;
    const { schoolSlug } = params;
    
    // Use requireSchoolAccess to allow teachers/admins/accountants/etc with access to this school
    // to fetch its metadata (logo, name, etc.)
    await requireSchoolAccess(schoolSlug);

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
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
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    return NextResponse.json(school);
  } catch (error) {
    console.error("Error fetching school:", error);
    return NextResponse.json(
      { error: "Failed to fetch school" },
      { status: 500 },
    );
  }
}

// PATCH - Update school
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session || session.user.role !== "superAdmin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const params = await context.params;
    const { schoolSlug } = params;
    const body = await request.json();

    console.log("Received update for school:", schoolSlug);
    console.log("Update data:", JSON.stringify(body, null, 2));

    // Check if school exists
    const existingSchool = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: {
        id: true,
        name: true,
        subdomain: true,
        logo: true,
        organizationId: true,
      },
    });

    if (!existingSchool) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Build update object
    const updateData: Prisma.SchoolUpdateInput = {};

    // String fields
    const stringFields = [
      "name",
      "code",
      "subdomain",
      "currency",
      "timezone",
      "locale",
      "primaryColor",
      "secondaryColor",
    ] as const;

    for (const field of stringFields) {
      if (body[field] !== undefined && typeof body[field] === "string") {
        updateData[field] = body[field];
      }
    }

    // Nullable string fields
    const nullableFields = [
      "email",
      "phone",
      "address",
      "motto",
      "website",
      "logo",
    ] as const;

    for (const field of nullableFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field] === "" ? null : body[field];
      }
    }

    // JSON fields
    if (body.settings !== undefined) {
      updateData.settings =
        typeof body.settings === "string"
          ? JSON.parse(body.settings)
          : body.settings;
    }

    if (body.features !== undefined) {
      updateData.features =
        typeof body.features === "string"
          ? JSON.parse(body.features)
          : body.features;
    }

    console.log("Prepared update data:", JSON.stringify(updateData, null, 2));

    // Check if organization needs updating
    const needsOrgUpdate =
      (body.name && body.name !== existingSchool.name) ||
      (body.logo !== undefined && body.logo !== existingSchool.logo) ||
      (body.subdomain && body.subdomain !== existingSchool.subdomain);

    // Update organization if needed
    if (needsOrgUpdate) {
      const orgData: Record<string, string | undefined> = {};

      if (body.name && body.name !== existingSchool.name) {
        orgData.name = body.name;
      }
      if (body.logo !== undefined && body.logo !== existingSchool.logo) {
        orgData.logo = body.logo || undefined;
      }
      if (body.subdomain && body.subdomain !== existingSchool.subdomain) {
        orgData.slug = body.subdomain;
      }

      console.log("Updating organization with:", orgData);

      await auth.api.updateOrganization({
        body: {
          data: orgData,
          organizationId: existingSchool.organizationId,
        },
        headers: await headers(),
      });
    }

    // Update school
    const updatedSchool = await prisma.school.update({
      where: { id: existingSchool.id },
      data: updateData,
      include: {
        subscription: true,
        organization: true,
      },
    });

    return NextResponse.json(updatedSchool);
  } catch (error) {
    console.error("Error updating school:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "School code or subdomain already exists" },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      {
        error: "Failed to update school",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// DELETE - Delete school
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();

    if (!session || session.user.role !== "superAdmin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const params = await context.params;
    const { schoolSlug } = params;

    // Get school
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: {
        id: true,
        organizationId: true,
        subscription: {
          select: { id: true },
        },
        _count: {
          select: {
            students: true,
            teachers: true,
            staff: true,
            guardians: true,
          },
        },
      },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Check for users
    const totalUsers =
      school._count.students +
      school._count.teachers +
      school._count.staff +
      school._count.guardians;

    if (totalUsers > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete school with existing users",
          details: `This school has ${totalUsers} users. Please remove all users first.`,
        },
        { status: 400 },
      );
    }

    const organizationId = school.organizationId;
    const subscriptionId = school.subscription?.id;

    // Delete in transaction
    await prisma.$transaction(async (tx) => {
      // Delete subscription
      if (subscriptionId) {
        await tx.invoiceRecord.deleteMany({
          where: { subscriptionId },
        });
        await tx.subscription.delete({
          where: { id: subscriptionId },
        });
      }

      // Delete school
      await tx.school.delete({
        where: { id: school.id },
      });
    });

    // Delete organization
    try {
      await auth.api.deleteOrganization({
        body: {
          organizationId: organizationId,
        },
        headers: await headers(),
      });
    } catch (orgError) {
      console.warn("Organization deletion failed:", orgError);
    }

    return NextResponse.json({
      message: "School deleted successfully",
      schoolSlug,
    });
  } catch (error) {
    console.error("Error in DELETE handler:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2003" || error.code === "P2014") {
        return NextResponse.json(
          {
            error: "Cannot delete school",
            details:
              "There are still related records that must be deleted first.",
          },
          { status: 400 },
        );
      }
    }

    return NextResponse.json(
      {
        error: "Failed to delete school",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
