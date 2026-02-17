// app/api/schools/[schoolSlug]/students/[studentId]/guardians/route.ts

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import crypto from "crypto";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import type { GuardianType } from "@/lib/generated/prisma/client";
import { headers } from "next/headers";

const addGuardianSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  otherNames: z
    .string()
    .optional()
    .nullable()
    .transform((val) => val || null),
  email: z.string().email(),
  phone: z.string().min(10),
  alternatePhone: z
    .string()
    .optional()
    .nullable()
    .transform((val) => val || null),
  relationshipType: z.enum([
    "FATHER",
    "MOTHER",
    "GUARDIAN",
    "SIBLING",
    "RELATIVE",
    "OTHER",
  ]),
  occupation: z
    .string()
    .optional()
    .nullable()
    .transform((val) => val || null),
  employer: z
    .string()
    .optional()
    .nullable()
    .transform((val) => val || null),
  workPhone: z
    .string()
    .optional()
    .nullable()
    .transform((val) => val || null),
  workAddress: z
    .string()
    .optional()
    .nullable()
    .transform((val) => val || null),
  isPrimary: z.boolean().default(false),
  canPickup: z.boolean().default(true),
  receiveReports: z.boolean().default(true),
  receiveAlerts: z.boolean().default(true),
  studentId: z.string(),
  schoolId: z.string(),
  organizationId: z.string(),
});

type AddGuardianData = z.infer<typeof addGuardianSchema>;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; studentId: string }> },
) {
  try {
    const { schoolSlug, studentId } = await params;

    // ========================================================================
    // STEP 1: Validate access
    // ========================================================================
    const session = await requireSchoolAccess(schoolSlug);
    const schoolAccess = getSchoolRole(session, schoolSlug);

    if (!schoolAccess) {
      return NextResponse.json(
        { error: "No access to this school" },
        { status: 403 },
      );
    }

    // Only admin/owner can add guardians
    if (
      schoolAccess.effectiveRole !== "admin" &&
      schoolAccess.effectiveRole !== "owner" &&
      !session.isSuperAdmin
    ) {
      return NextResponse.json(
        { error: "Only administrators can add guardians" },
        { status: 403 },
      );
    }

    // ========================================================================
    // STEP 2: Validate request body
    // ========================================================================
    const body = await req.json();
    console.log("[Add Guardian] Request body:", JSON.stringify(body, null, 2));

    const validation = addGuardianSchema.safeParse(body);

    if (!validation.success) {
      console.error("[Add Guardian] Validation failed:", validation.error);
      console.error(
        "[Add Guardian] Error details:",
        JSON.stringify(validation.error.format(), null, 2),
      );
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const data: AddGuardianData = validation.data;

    // ========================================================================
    // STEP 3: Verify student exists
    // ========================================================================
    const student = await prisma.student.findUnique({
      where: {
        id: studentId,
        schoolId: data.schoolId,
      },
      include: {
        profile: true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // ========================================================================
    // STEP 4: Check if guardian already linked to this student
    // ========================================================================
    const existingLink = await prisma.guardianStudent.findFirst({
      where: {
        student: {
          id: studentId,
        },
        guardian: {
          email: data.email,
        },
      },
    });

    if (existingLink) {
      return NextResponse.json(
        {
          error: `${data.email} is already registered as a guardian for this student`,
        },
        { status: 409 },
      );
    }

    // ========================================================================
    // STEP 5: Check if user/guardian exists
    // ========================================================================
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    let guardian;

    if (existingUser) {
      // ====================================================================
      // Guardian user EXISTS
      // ====================================================================
      console.log(
        `📋 [Add Guardian] Guardian ${data.email} already has account`,
      );

      const guardianProfile = await prisma.userProfile.findUnique({
        where: { userId: existingUser.id },
      });

      if (!guardianProfile) {
        throw new Error(`User profile not found for guardian ${data.email}`);
      }

      // Find or create Guardian record
      guardian = await prisma.guardian.findFirst({
        where: {
          schoolId: data.schoolId,
          email: data.email,
        },
      });

      if (!guardian) {
        guardian = await prisma.guardian.create({
          data: {
            schoolId: data.schoolId,
            guardianId: crypto.randomUUID(),
            firstName: data.firstName,
            lastName: data.lastName,
            otherNames: data.otherNames || null,
            email: data.email,
            phone: data.phone,
            alternatePhone: data.alternatePhone || null,
            relationshipType: data.relationshipType as GuardianType,
            occupation: data.occupation || null,
            employer: data.employer || null,
            workPhone: data.workPhone || null,
            workAddress: data.workAddress || null,
            profileId: guardianProfile.id,
            canLogin: true,
          },
        });
      }

      // Add to organization if not already member
      const existingMembership = await prisma.member.findFirst({
        where: {
          userId: existingUser.id,
          organizationId: data.organizationId,
        },
      });

      if (!existingMembership) {
        await auth.api.addMember({
          body: {
            organizationId: data.organizationId,
            userId: existingUser.id,
            role: "member",
          },
        });
        console.log(`✅ [Add Guardian] Added ${data.email} to organization`);
      }
    } else {
      // ====================================================================
      // NEW guardian - create record and send invitation
      // ====================================================================
      console.log(
        `📧 [Add Guardian] Creating guardian and sending invitation: ${data.email}`,
      );

      guardian = await prisma.guardian.create({
        data: {
          schoolId: data.schoolId,
          guardianId: crypto.randomUUID(),
          firstName: data.firstName,
          lastName: data.lastName,
          otherNames: data.otherNames || null,
          email: data.email,
          phone: data.phone,
          alternatePhone: data.alternatePhone || null,
          relationshipType: data.relationshipType as GuardianType,
          occupation: data.occupation || null,
          employer: data.employer || null,
          workPhone: data.workPhone || null,
          workAddress: data.workAddress || null,
          canLogin: true,
        },
      });

      // Link to student first
      await prisma.guardianStudent.create({
        data: {
          guardianId: guardian.id,
          studentId: student.id,
          isPrimary: data.isPrimary,
          canPickup: data.canPickup,
          receiveReports: data.receiveReports,
          receiveAlerts: data.receiveAlerts,
        },
      });

      // Send invitation
      await auth.api.createInvitation({
        body: {
          email: data.email,
          organizationId: data.organizationId,
          role: "member",
        },
        headers: await headers(),
      });

      console.log(`✅ [Add Guardian] Sent invitation to ${data.email}`);
    }

    // ========================================================================
    // STEP 6: Link guardian to student (if not done above)
    // ========================================================================
    const link = await prisma.guardianStudent.findUnique({
      where: {
        guardianId_studentId: {
          guardianId: guardian.id,
          studentId: student.id,
        },
      },
    });

    if (!link) {
      await prisma.guardianStudent.create({
        data: {
          guardianId: guardian.id,
          studentId: student.id,
          isPrimary: data.isPrimary,
          canPickup: data.canPickup,
          receiveReports: data.receiveReports,
          receiveAlerts: data.receiveAlerts,
        },
      });
    }

    // ========================================================================
    // STEP 7: Create audit log
    // ========================================================================
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entityType: "GUARDIAN",
        entityId: guardian.id,
        newValues: {
          guardianEmail: data.email,
          guardianName: `${data.firstName} ${data.lastName}`,
          studentId: student.id,
          studentName: `${student.profile.firstName} ${student.profile.lastName}`,
          relationship: data.relationshipType,
          addedBy: session.user.email,
        },
      },
    });

    // ========================================================================
    // RESPONSE
    // ========================================================================
    return NextResponse.json(
      {
        success: true,
        message: existingUser
          ? `${data.email} has been added as a guardian`
          : `Guardian added and invitation sent to ${data.email}`,
        guardian: {
          id: guardian.id,
          email: data.email,
          name: `${data.firstName} ${data.lastName}`,
          relationshipType: data.relationshipType,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[Add Guardian] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to add guardian",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// GET - List all guardians for a student
// ============================================================================

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string; studentId: string }> },
) {
  try {
    const { schoolSlug, studentId } = await params;

    const session = await requireSchoolAccess(schoolSlug);
    const schoolAccess = getSchoolRole(session, schoolSlug);

    if (!schoolAccess) {
      return NextResponse.json(
        { error: "No access to this school" },
        { status: 403 },
      );
    }

    const guardians = await prisma.guardianStudent.findMany({
      where: { studentId },
      include: {
        guardian: true,
      },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({
      success: true,
      guardians,
      count: guardians.length,
    });
  } catch (error) {
    console.error("[Get Guardians] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch guardians",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
