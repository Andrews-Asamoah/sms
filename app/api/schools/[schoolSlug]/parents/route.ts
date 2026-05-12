// app/api/schools/[schoolSlug]/parents/route.ts

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import crypto from "crypto";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import type { GuardianType } from "@prisma/client";
import { headers } from "next/headers";

const addParentSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  otherNames: z.string().optional().nullable(),
  email: z.string().email(),
  phone: z.string().min(10),
  alternatePhone: z.string().optional().nullable(),
  relationshipType: z.enum([
    "FATHER",
    "MOTHER",
    "GUARDIAN",
    "SIBLING",
    "RELATIVE",
    "OTHER",
  ]),
  occupation: z.string().optional().nullable(),
  employer: z.string().optional().nullable(),
  workPhone: z.string().optional().nullable(),
  workAddress: z.string().optional().nullable(),
  canLogin: z.boolean().default(true),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const schoolAccess = getSchoolRole(session, schoolSlug);

    if (!schoolAccess) {
      return NextResponse.json(
        { error: "No access to this school" },
        { status: 403 },
      );
    }

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const parents = await prisma.guardian.findMany({
      where: {
        schoolId: school.id,
      },
      include: {
        students: {
          include: {
            student: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      parents: parents.map((p) => ({
        ...p,
        studentCount: p.students.length,
        studentNames: p.students
          .map(
            (s) =>
              `${s.student.profile.firstName} ${s.student.profile.lastName}`,
          )
          .join(", "),
      })),
    });
  } catch (error) {
    console.error("[Get Parents] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch parents" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const schoolAccess = getSchoolRole(session, schoolSlug);

    if (
      !schoolAccess ||
      (schoolAccess.effectiveRole !== "admin" &&
        schoolAccess.effectiveRole !== "owner" &&
        !session.isSuperAdmin)
    ) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 403 },
      );
    }

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const body = await req.json();
    const validation = addParentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const data = validation.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    let guardian;

    if (existingUser) {
      // Find or create Guardian record for this school
      guardian = await prisma.guardian.findFirst({
        where: {
          schoolId: school.id,
          email: data.email,
        },
      });

      if (!guardian) {
        const profile = await prisma.userProfile.findUnique({
          where: { userId: existingUser.id },
        });

        guardian = await prisma.guardian.create({
          data: {
            schoolId: school.id,
            guardianId: crypto.randomUUID(),
            firstName: data.firstName,
            lastName: data.lastName,
            otherNames: data.otherNames,
            email: data.email,
            phone: data.phone,
            alternatePhone: data.alternatePhone,
            relationshipType: data.relationshipType as GuardianType,
            occupation: data.occupation,
            employer: data.employer,
            workPhone: data.workPhone,
            workAddress: data.workAddress,
            profileId: profile?.id,
            canLogin: true,
          },
        });
      }

      // Ensure membership
      const membership = await prisma.member.findFirst({
        where: {
          userId: existingUser.id,
          organizationId: school.organizationId,
        },
      });

      if (!membership) {
        await auth.api.addMember({
          body: {
            organizationId: school.organizationId,
            userId: existingUser.id,
            role: "member",
          },
        });
      }
    } else {
      // New guardian
      guardian = await prisma.guardian.create({
        data: {
          schoolId: school.id,
          guardianId: crypto.randomUUID(),
          firstName: data.firstName,
          lastName: data.lastName,
          otherNames: data.otherNames,
          email: data.email,
          phone: data.phone,
          alternatePhone: data.alternatePhone,
          relationshipType: data.relationshipType as GuardianType,
          occupation: data.occupation,
          employer: data.employer,
          workPhone: data.workPhone,
          workAddress: data.workAddress,
          canLogin: true,
        },
      });

      // Send invitation
      await auth.api.createInvitation({
        body: {
          email: data.email,
          organizationId: school.organizationId,
          role: "member",
        },
        headers: await headers(),
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entityType: "GUARDIAN",
        entityId: guardian.id,
        newValues: {
          parentEmail: data.email,
          parentName: `${data.firstName} ${data.lastName}`,
          addedBy: session.user.email,
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: existingUser
          ? "Parent added"
          : "Parent added and invitation sent",
        guardian,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[Create Parent] Error:", error);
    return NextResponse.json(
      { error: "Failed to create parent" },
      { status: 500 },
    );
  }
}
