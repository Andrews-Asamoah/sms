import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
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
      const existingMember =
        existingUser.members && existingUser.members.length > 0
          ? existingUser.members[0]
          : null;

      if (existingMember) {
        // ✅ CRITICAL: Append guardian role WITHOUT clobbering existing roles.
        // Never call auth.api.addMember here — it overwrites the entire role field.
        const roles = existingMember.role
          .split(",")
          .map((r) => r.trim())
          .filter(Boolean);
        if (!roles.includes("guardian")) {
          roles.push("guardian");
          await prisma.member.update({
            where: { id: existingMember.id },
            data: { role: roles.join(",") },
          });
        }
        // Member already exists with correct roles — nothing more to do for auth
      } else {
        // User exists in the system but is not a member of this org yet.
        // Create the member record directly so we can control the role string.
        await prisma.member.create({
          data: {
            id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            organizationId: school.organizationId,
            userId: existingUser.id,
            role: "guardian",
          },
        });
      }

      // Reuse the existing profile if it exists
      if (existingUser.userProfile) {
        profileId = existingUser.userProfile.id;
      }
    } else {
      // Brand-new user — send an invitation. The invitation handler will assign
      // them the guardian role upon acceptance without touching any other roles.
      const { auth } = await import("@/lib/auth");

      // Clean up any existing invitations for this email in this organization
      await prisma.invitation.deleteMany({
        where: {
          email: data.email,
          organizationId: school.organizationId,
          status: { in: ["pending", "expired"] },
        },
      });

      // Clean up any existing pending guardian records (profileId is null) for this email/school
      await prisma.guardian.deleteMany({
        where: {
          email: data.email,
          schoolId: school.id,
          profileId: null,
        },
      });

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
          { status: 500 },
        );
      }
    }

    // Create the Guardian record and ward links in a transaction
    const guardian = await prisma.$transaction(async (tx) => {
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
