// app/api/schools/[schoolId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma";

// Add this type for params in Next.js 15
type RouteContext = {
  params: Promise<{
    schoolId: string;
  }>;
};

// GET - Fetch single school
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getAuthSession();
    if (!session || session.user.role !== "superAdmin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const params = await context.params;
    const { schoolId } = params;

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
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
      { status: 500 }
    );
  }
}

// PATCH - Update school
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await getAuthSession();
    if (!session || session.user.role !== "superAdmin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const params = await context.params;
    const { schoolId } = params;
    const body = await request.json();

    console.log("Received update data:", body); // Debug log

    // Check if school exists
    const existingSchool = await prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        organization: true,
      },
    });

    if (!existingSchool) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Build update object only with provided fields
    const updateData: Prisma.SchoolUpdateInput = {};
    const orgUpdateData: Prisma.OrganizationUpdateInput = {};

    // School fields
    if (body.name !== undefined) updateData.name = body.name;
    if (body.code !== undefined) updateData.code = body.code;
    if (body.subdomain !== undefined) updateData.subdomain = body.subdomain;
    if (body.email !== undefined) updateData.email = body.email || null;
    if (body.phone !== undefined) updateData.phone = body.phone || null;
    if (body.address !== undefined) updateData.address = body.address || null;
    if (body.motto !== undefined) updateData.motto = body.motto || null;
    if (body.website !== undefined) updateData.website = body.website || null;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.timezone !== undefined) updateData.timezone = body.timezone;
    if (body.locale !== undefined) updateData.locale = body.locale;
    if (body.primaryColor !== undefined)
      updateData.primaryColor = body.primaryColor;
    if (body.secondaryColor !== undefined)
      updateData.secondaryColor = body.secondaryColor;
    if (body.logo !== undefined) updateData.logo = body.logo || null;
    if (body.settings !== undefined) updateData.settings = body.settings;
    if (body.features !== undefined) updateData.features = body.features;

    // Organization fields
    if (body.name !== undefined && body.name !== existingSchool.name) {
      orgUpdateData.name = body.name;
    }
    if (
      body.subdomain !== undefined &&
      body.subdomain !== existingSchool.subdomain
    ) {
      orgUpdateData.slug = body.subdomain;
    }

    console.log("School update data:", updateData); // Debug log
    console.log("Organization update data:", orgUpdateData); // Debug log

    // Use transaction to update both school and organization
    const updatedSchool = await prisma.$transaction(async (tx) => {
      // Update organization if needed
      if (Object.keys(orgUpdateData).length > 0) {
        await tx.organization.update({
          where: { id: existingSchool.organizationId },
          data: orgUpdateData,
        });
      }

      // Update school
      const school = await tx.school.update({
        where: { id: schoolId },
        data: updateData,
        include: {
          subscription: true,
          organization: true,
        },
      });

      return school;
    });

    return NextResponse.json(updatedSchool);
  } catch (error) {
    console.error("Error updating school:", error);

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
      { error: "Failed to update school" },
      { status: 500 }
    );
  }
}
// DELETE - Delete school
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    console.log("DELETE request received"); // Debug log

    const session = await getAuthSession();
    console.log("Session:", session?.user?.role); // Debug log

    if (!session || session.user.role !== "superAdmin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const params = await context.params;
    const { schoolId } = params;
    console.log("School ID to delete:", schoolId); // Debug log

    // Check if school exists
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        organization: true,
        subscription: true,
        _count: {
          select: {
            students: true,
            teachers: true,
            staff: true,
            guardians: true,
            academicYears: true,
            departments: true,
            classes: true,
            subjects: true,
            houses: true,
            gradingSystems: true,
            feeStructures: true,
            chartAccounts: true,
            transactions: true,
            bills: true,
            payments: true,
            documents: true,
            assessmentTemplates: true,
          },
        },
      },
    });

    console.log("School found:", school ? "Yes" : "No"); // Debug log

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Check if school has any data
    const hasUsers =
      school._count.students > 0 ||
      school._count.teachers > 0 ||
      school._count.staff > 0 ||
      school._count.guardians > 0;

    const hasAcademicData =
      school._count.academicYears > 0 ||
      school._count.departments > 0 ||
      school._count.classes > 0 ||
      school._count.subjects > 0 ||
      school._count.houses > 0;

    const hasFinancialData =
      school._count.bills > 0 ||
      school._count.payments > 0 ||
      school._count.transactions > 0;

    console.log("Has data:", { hasUsers, hasAcademicData, hasFinancialData }); // Debug log

    // Build detailed error message
    if (hasUsers || hasAcademicData || hasFinancialData) {
      const details = [];
      if (hasUsers) {
        details.push(
          `${school._count.students} students, ${school._count.teachers} teachers, ${school._count.staff} staff, ${school._count.guardians} guardians`
        );
      }
      if (hasAcademicData) {
        details.push(
          `${school._count.academicYears} academic years, ${school._count.classes} classes, ${school._count.departments} departments`
        );
      }
      if (hasFinancialData) {
        details.push(
          `${school._count.bills} bills, ${school._count.payments} payments, ${school._count.transactions} transactions`
        );
      }

      return NextResponse.json(
        {
          error: "Cannot delete school with existing data",
          details: `This school has: ${details.join(
            "; "
          )}. Please remove all data first.`,
        },
        { status: 400 }
      );
    }

    console.log("Starting deletion..."); // Debug log

    // Delete in transaction - order matters due to foreign key constraints
    await prisma.$transaction(async (tx) => {
      // 1. Delete custom categories (no dependencies)
      await tx.customFeeCategory.deleteMany({
        where: { schoolId },
      });
      await tx.customExpenseCategory.deleteMany({
        where: { schoolId },
      });
      await tx.customTransactionCategory.deleteMany({
        where: { schoolId },
      });

      // 2. Delete assessment templates and grading systems
      await tx.assessmentTemplate.deleteMany({
        where: { schoolId },
      });
      await tx.gradingSystem.deleteMany({
        where: { schoolId },
      });

      // 3. Delete fee structures
      await tx.feeStructure.deleteMany({
        where: { schoolId },
      });

      // 4. Delete chart accounts
      await tx.chartAccount.deleteMany({
        where: { schoolId },
      });

      // 5. Delete documents
      await tx.document.deleteMany({
        where: { schoolId },
      });

      // 6. Delete houses
      await tx.house.deleteMany({
        where: { schoolId },
      });

      // 7. Delete subjects
      await tx.subject.deleteMany({
        where: { schoolId },
      });

      // 8. Delete academic years (will cascade to terms)
      await tx.academicYear.deleteMany({
        where: { schoolId },
      });

      // 9. Delete departments
      await tx.department.deleteMany({
        where: { schoolId },
      });

      // 10. Delete subscription and invoices
      if (school.subscription) {
        await tx.invoiceRecord.deleteMany({
          where: { subscriptionId: school.subscription.id },
        });
        await tx.subscription.delete({
          where: { id: school.subscription.id },
        });
      }

      // 11. Delete the school
      await tx.school.delete({
        where: { id: schoolId },
      });

      // 12. Delete organization (will cascade to members and invitations)
      await tx.organization.delete({
        where: { id: school.organizationId },
      });
    });

    console.log("Deletion completed successfully"); // Debug log

    return NextResponse.json({
      message: "School deleted successfully",
      schoolId,
    });
  } catch (error) {
    console.error("Error deleting school:", error);

    // Provide more detailed error info
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: "Failed to delete school",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to delete school" },
      { status: 500 }
    );
  }
}
