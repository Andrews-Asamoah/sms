import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { Gender } from "@/lib/generated/prisma/client";

// Schema for teacher invitation
const teacherInviteSchema = z.object({
  email: z.string().email("Valid email is required"),
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  staffNumber: z.string().nullable().optional(),
  departmentId: z.string().min(1, "Department is required"),
  houseId: z.string().nullable().optional(),
  qualification: z.string().nullable().optional(),
  specialization: z.string().nullable().optional(),
  experience: z.number().nullable().optional(),
  employmentType: z.enum([
    "FULL_TIME",
    "PART_TIME",
    "CONTRACT",
    "TEMPORARY",
    "INTERN",
  ]),
  hireDate: z.string().min(1, "Hire date is required"),
  contractEndDate: z.string().nullable().optional(),
  monthlySalary: z.number().nullable().optional(),
  isActive: z.boolean().default(true),
  // When true, skip the confirmation prompt and directly add as teacher
  force: z.boolean().optional().default(false),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner" &&
      !session.isSuperAdmin
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const departmentId = searchParams.get("departmentId");
    const houseId = searchParams.get("houseId");
    const isActiveParam = searchParams.get("isActive");

    // Get school ID
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const where: Record<string, unknown> = {
      schoolId: school.id,
    };

    if (isActiveParam !== null && isActiveParam !== undefined) {
      where.isActive = isActiveParam === "true";
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (houseId) {
      where.houseId = houseId;
    }

    if (search) {
      where.OR = [
        {
          profile: {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { otherNames: { contains: search, mode: "insensitive" } },
            ],
          },
        },
        { teacherId: { contains: search, mode: "insensitive" } },
        { staffNumber: { contains: search, mode: "insensitive" } },
        { invitationEmail: { contains: search, mode: "insensitive" } },
      ];
    }

    const teachers = await prisma.teacher.findMany({
      where,
      include: {
        profile: true,
        department: true,
        house: true,
        _count: {
          select: {
            subjects: true,
            classesAsClassTeacher: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(teachers);
  } catch (error) {
    console.error("Error fetching teachers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
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
    const role = getSchoolRole(session, schoolSlug);

    if (
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner" &&
      !session.isSuperAdmin
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const result = teacherInviteSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 },
      );
    }

    const data = result.data;

    // Fetch school + its organization
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true, name: true, organizationId: true },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Reject duplicate pending invite for the same email in this school
    const existingPending = await prisma.teacher.findFirst({
      where: { schoolId: school.id, invitationEmail: data.email },
    });

    if (existingPending) {
      return NextResponse.json(
        { error: "A pending invitation already exists for this email" },
        { status: 409 },
      );
    }

    // Process based on whether the user already exists in the system
    const formatDate = (dateString: string) => new Date(dateString);
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    const teacherId = `T-${year}-${random}`;

    // Reject if a fully linked teacher with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
      include: {
        userProfile: true,
        members: {
          where: { organizationId: school.organizationId },
        },
      },
    });

    if (existingUser?.userProfile) {
      const linkedTeacher = await prisma.teacher.findFirst({
        where: {
          schoolId: school.id,
          profileId: existingUser.userProfile.id,
        },
      });
      if (linkedTeacher) {
        return NextResponse.json(
          { error: "This user is already a teacher in this school" },
          { status: 409 },
        );
      }
    }

    if (existingUser) {
      // Determine their current role in this school (if any)
      const isMember = existingUser.members?.some(
        (m) => m.organizationId === school.organizationId,
      );

      // If NOT forcing, return a confirmation prompt to the admin
      if (!data.force) {
        // Look up their profile to show a name
        const profileName = existingUser.userProfile
          ? `${existingUser.userProfile.firstName} ${existingUser.userProfile.lastName}`.trim()
          : existingUser.name || existingUser.email;

        return NextResponse.json({
          needsConfirmation: true,
          existingUser: {
            id: existingUser.id,
            name: profileName,
            email: existingUser.email,
            isMember,
          },
        });
      }

      // Admin confirmed — proceed with adding as teacher
      try {
        if (!isMember) {
          await auth.api.addMember({
            body: {
              organizationId: school.organizationId,
              userId: existingUser.id,
              role: "member",
            },
            headers: req.headers,
          });
        }

        let profileId = existingUser.userProfile?.id;

        if (!profileId) {
          // Fallback: create a basic profile if missing
          const nameParts = existingUser.name.trim().split(/\s+/);
          const firstName = nameParts[0] || "User";
          const lastName =
            nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Profile";

          const newProfile = await prisma.userProfile.create({
            data: {
              userId: existingUser.id,
              firstName,
              lastName,
              gender: Gender.OTHER,
              dateOfBirth: new Date("2000-01-01"),
              isActive: true,
            },
          });
          profileId = newProfile.id;
        }

        const teacher = await prisma.teacher.create({
          data: {
            teacherId,
            schoolId: school.id,
            profileId: profileId,
            invitationEmail: null, // Fully linked immediately
            staffNumber: data.staffNumber ?? null,
            firstName: data.firstName,
            lastName: data.lastName,
            departmentId: data.departmentId,
            houseId: data.houseId ?? null,
            qualification: data.qualification ?? null,
            specialization: data.specialization ?? null,
            experience: data.experience ?? null,
            employmentType: data.employmentType,
            hireDate: formatDate(data.hireDate),
            contractEndDate: data.contractEndDate
              ? formatDate(data.contractEndDate)
              : null,
            monthlySalary: data.monthlySalary ?? null,
            isActive: data.isActive,
          },
        });

        return NextResponse.json({
          teacher,
          invited: false,
          isExistingUser: true,
        });
      } catch (addError) {
        console.error("Error adding existing user to org:", addError);
        return NextResponse.json(
          { error: "Failed to add existing user to school" },
          { status: 500 },
        );
      }
    }

    // New User: Send BetterAuth org invitation with role "member"
    const inviteResponse = await auth.api.createInvitation({
      body: {
        email: data.email,
        role: "member",
        organizationId: school.organizationId,
      },
      headers: req.headers,
    });

    if (!inviteResponse) {
      return NextResponse.json(
        { error: "Failed to create invitation" },
        { status: 500 },
      );
    }

    // Create pending Teacher record (profileId stays null until teacher accepts invite)
    const teacher = await prisma.teacher.create({
      data: {
        teacherId,
        schoolId: school.id,
        profileId: null,
        invitationEmail: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        staffNumber: data.staffNumber ?? null,
        departmentId: data.departmentId,
        houseId: data.houseId ?? null,
        qualification: data.qualification ?? null,
        specialization: data.specialization ?? null,
        experience: data.experience ?? null,
        employmentType: data.employmentType,
        hireDate: formatDate(data.hireDate),
        contractEndDate: data.contractEndDate
          ? formatDate(data.contractEndDate)
          : null,
        monthlySalary: data.monthlySalary ?? null,
        isActive: data.isActive,
      },
    });

    return NextResponse.json({ teacher, invited: true, isNewUser: true });
  } catch (error) {
    console.error("Error inviting teacher:", error);
    if (error instanceof Error && error.message.includes("already a teacher")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
