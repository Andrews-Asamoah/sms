import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { auth } from "@/lib/auth";
import * as z from "zod";

const guardianSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  phone: z.string(),
  alternatePhone: z.string().optional(),
  occupation: z.string().optional(),
  address: z.string().optional(),
  relationshipType: z.enum([
    "FATHER",
    "MOTHER",
    "GUARDIAN",
    "SIBLING",
    "RELATIVE",
    "OTHER",
  ]),
  wards: z.array(
    z.object({
      studentId: z.string(),
      isPrimary: z.boolean(),
    }),
  ),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;
    const session = await requireSchoolAccess(schoolSlug);

    const body = await request.json();
    const data = guardianSchema.parse(body);

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true, organizationId: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
      include: {
        userProfile: true,
        members: {
          where: { organizationId: school.organizationId },
        },
      },
    });

    let profileId: string | undefined = undefined;

    if (existingUser) {
      const isMember = existingUser.members && existingUser.members.length > 0;

      if (isMember) {
        const member = existingUser.members[0];
        const roles = member.role.split(",");
        if (!roles.includes("guardian")) {
          // Add guardian role
          roles.push("guardian");
          await prisma.member.update({
            where: { id: member.id },
            data: { role: roles.join(",") },
          });
        }
      } else {
        await auth.api.addMember({
          headers: request.headers,
          body: {
            organizationId: school.organizationId,
            userId: existingUser.id,
            role: "guardian",
          },
        });
      }

      // If they have a profile, we can use it
      if (existingUser.userProfile) {
        profileId = existingUser.userProfile.id;
      }
    } else {
      // Create user and invitation
      const invitation = await auth.api.createInvitation({
        headers: request.headers,
        body: {
          email: data.email,
          role: "guardian",
          organizationId: school.organizationId,
        },
      });

      if (!invitation) {
        return NextResponse.json(
          { error: "Failed to create invitation" },
          { status: 500 }
        );
      }
    }

    // Create the Guardian record and links in a transaction
    const guardian = await prisma.$transaction(async (tx) => {
      // 1. Create the Guardian record
      const newGuardian = await tx.guardian.create({
        data: {
          schoolId: school.id,
          profileId: profileId || null,
          guardianId: `G-${Date.now().toString().slice(-6)}`,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          alternatePhone: data.alternatePhone,
          occupation: data.occupation,
          relationshipType: data.relationshipType,
          isActive: true,
          canLogin: true,
        },
      });

      // 2. Link wards
      await Promise.all(
        data.wards.map((ward) =>
          tx.guardianStudent.create({
            data: {
              guardianId: newGuardian.id,
              studentId: ward.studentId,
              isPrimary: ward.isPrimary,
            },
          }),
        ),
      );

      return newGuardian;
    });

    return NextResponse.json(guardian);
  } catch (error) {
    console.error("❌ Error creating guardian:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to create guardian" },
      { status: 500 },
    );
  }
}
