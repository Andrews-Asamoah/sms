// app/api/schools/[schoolSlug]/students/route.ts - FIXED
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import {
  generateStudentId,
  generateAdmissionNumber,
} from "@/lib/utils/student-ids";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Prisma } from "@/lib/generated/prisma/client";

// Guardian schema
const guardianSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  otherNames: z.string().optional().nullable(),
  email: z.string().email(), // This ensures email is always valid
  phone: z.string().min(10),
  alternatePhone: z.string().optional().nullable(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().nullable(),
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
  workAddress: z.string().optional().nullable(),
  workPhone: z.string().optional().nullable(),
  residentialAddress: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  isPrimary: z.boolean(),
  canPickup: z.boolean(),
  receiveReports: z.boolean(),
  receiveAlerts: z.boolean(),
});

const createStudentSchema = z.object({
  // Personal Information
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  otherNames: z.string().optional().nullable(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dateOfBirth: z.string().min(1),
  nationality: z.string().default("Ghanaian"),
  // Contact
  phone: z.string().optional().nullable(),
  alternatePhone: z.string().optional().nullable(),
  // Address
  residentialAddress: z.string().optional().nullable(),
  postalAddress: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  country: z.string().default("Ghana"),
  // Student Specific - IDs will be auto-generated if not provided
  studentId: z.string().optional(),
  admissionNumber: z.string().optional(),
  admissionDate: z.string().min(1),
  classId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  houseId: z.string().optional().nullable(),
  // Previous School
  previousSchool: z.string().optional().nullable(),
  previousClass: z.string().optional().nullable(),
  // Medical
  bloodGroup: z.string().optional().nullable(),
  allergies: z.string().optional().nullable(),
  medicalConditions: z.string().optional().nullable(),
  // Emergency
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),
  emergencyRelationship: z.string().optional().nullable(),
  schoolId: z.string().min(1),
  // Guardians array - OPTIONAL
  guardians: z.array(guardianSchema).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  console.log("📝 [Student Create] Starting student creation process...");

  try {
    const { schoolSlug } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner" &&
      !session.isSuperAdmin
    ) {
      console.log("❌ [Student Create] Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createStudentSchema.parse(body);

    console.log(
      `👤 [Student Create] Creating student: ${validatedData.firstName} ${validatedData.lastName}`,
    );

    // Verify school exists
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug, id: validatedData.schoolId },
      include: {
        organization: true,
      },
    });

    if (!school) {
      console.log("❌ [Student Create] School not found");
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    console.log(`🏫 [Student Create] School found: ${school.name}`);

    // Generate student ID if not provided
    const studentId =
      validatedData.studentId || (await generateStudentId(school.id));
    console.log(`🆔 [Student Create] Student ID: ${studentId}`);

    // Generate admission number if not provided
    const admissionNumber =
      validatedData.admissionNumber ||
      (await generateAdmissionNumber(school.id, school.code));
    console.log(`🎫 [Student Create] Admission Number: ${admissionNumber}`);

    // Check if studentId already exists
    const existingStudent = await prisma.student.findFirst({
      where: {
        studentId,
        schoolId: school.id,
      },
    });

    if (existingStudent) {
      console.log("❌ [Student Create] Student ID already exists");
      return NextResponse.json(
        { error: "Student ID already exists" },
        { status: 400 },
      );
    }

    // Check if admissionNumber already exists
    const existingAdmission = await prisma.student.findFirst({
      where: {
        admissionNumber,
        schoolId: school.id,
      },
    });

    if (existingAdmission) {
      console.log("❌ [Student Create] Admission number already exists");
      return NextResponse.json(
        { error: "Admission number already exists" },
        { status: 400 },
      );
    }

    // Create student with profile AND guardians in a transaction
    console.log("💾 [Student Create] Starting database transaction...");
    const result = await prisma.$transaction(async (tx) => {
      // Create a temporary user account for the student
      console.log("👤 [Student Create] Creating student user account...");
      const tempUser = await tx.user.create({
        data: {
          name: `${validatedData.firstName} ${validatedData.lastName}`,
          email: `${studentId.toLowerCase()}@temp.${school.subdomain}.edu`,
          emailVerified: false,
          role: "user",
        },
      });

      // Create user profile for the student
      console.log("📋 [Student Create] Creating student profile...");
      const profile = await tx.userProfile.create({
        data: {
          userId: tempUser.id,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          otherNames: validatedData.otherNames,
          phone: validatedData.phone,
          alternatePhone: validatedData.alternatePhone,
          gender: validatedData.gender,
          dateOfBirth: new Date(validatedData.dateOfBirth),
          nationality: validatedData.nationality,
          residentialAddress: validatedData.residentialAddress,
          postalAddress: validatedData.postalAddress,
          city: validatedData.city,
          region: validatedData.region,
          country: validatedData.country,
          emergencyContactName: validatedData.emergencyContactName,
          emergencyContactPhone: validatedData.emergencyContactPhone,
          emergencyRelationship: validatedData.emergencyRelationship,
        },
      });

      // Create student record
      console.log("🎓 [Student Create] Creating student record...");
      const newStudent = await tx.student.create({
        data: {
          profileId: profile.id,
          schoolId: school.id,
          studentId,
          admissionNumber,
          admissionDate: new Date(validatedData.admissionDate),
          classId: validatedData.classId,
          departmentId: validatedData.departmentId,
          houseId: validatedData.houseId,
          previousSchool: validatedData.previousSchool,
          previousClass: validatedData.previousClass,
          bloodGroup: validatedData.bloodGroup,
          allergies: validatedData.allergies,
          medicalConditions: validatedData.medicalConditions,
          status: "ACTIVE",
        },
        include: {
          profile: true,
          class: {
            include: { academicYear: true },
          },
          department: true,
          house: true,
        },
      });

      console.log("✅ [Student Create] Student record created successfully");

      // ========== GUARDIAN PROCESSING ==========
      const guardianResults = [];

      if (validatedData.guardians && validatedData.guardians.length > 0) {
        console.log(
          `👥 [Guardians] Processing ${validatedData.guardians.length} guardian(s)...`,
        );

        for (const guardianData of validatedData.guardians) {
          console.log(`\n🔍 [Guardian] Processing: ${guardianData.email}`);

          // Check if guardian already exists by email in this school
          const existingGuardian = await tx.guardian.findFirst({
            where: {
              email: guardianData.email,
              schoolId: school.id,
            },
            include: {
              profile: {
                include: {
                  user: true,
                },
              },
            },
          });

          let guardian;
          let needsInvitation = false;

          if (existingGuardian) {
            // Guardian exists in this school - just link to student
            console.log(
              `✓ [Guardian] Found existing guardian in school: ${guardianData.email}`,
            );
            guardian = existingGuardian;
          } else {
            // Check if user exists across platform
            const existingUser = await tx.user.findUnique({
              where: { email: guardianData.email },
              include: {
                profile: true,
                memberships: {
                  where: {
                    organizationId: school.organizationId,
                  },
                },
              },
            });

            // Generate guardian ID
            const guardianCount = await tx.guardian.count({
              where: { schoolId: school.id },
            });
            const nextGuardianId = `GRD${(guardianCount + 1).toString().padStart(5, "0")}`;

            if (existingUser && existingUser.profile) {
              // User exists - create guardian record and link profile
              console.log(`✓ [Guardian] User exists: ${guardianData.email}`);

              guardian = await tx.guardian.create({
                data: {
                  guardianId: nextGuardianId,
                  schoolId: school.id,
                  profileId: existingUser.profile.id,
                  firstName: guardianData.firstName,
                  lastName: guardianData.lastName,
                  otherNames: guardianData.otherNames,
                  email: guardianData.email,
                  phone: guardianData.phone,
                  alternatePhone: guardianData.alternatePhone,
                  gender: guardianData.gender,
                  relationshipType: guardianData.relationshipType,
                  occupation: guardianData.occupation,
                  employer: guardianData.employer,
                  workAddress: guardianData.workAddress,
                  workPhone: guardianData.workPhone,
                  residentialAddress: guardianData.residentialAddress,
                  city: guardianData.city,
                  region: guardianData.region,
                  canLogin: true,
                  isActive: true,
                },
              });

              console.log(`✓ [Guardian] Guardian record created`);

              // Check if user is already a member of the school organization
              if (existingUser.memberships.length === 0) {
                // User exists but not in this school's organization - needs invitation
                console.log(
                  `📤 [Guardian] User exists but not in school organization - will send invitation`,
                );
                needsInvitation = true;
              } else {
                console.log(
                  `✓ [Guardian] User already member of school organization`,
                );
              }
            } else {
              // Brand new guardian - create guardian record without profile (will be linked when they accept)
              console.log(
                `✨ [Guardian] New guardian - will send invitation: ${guardianData.email}`,
              );

              guardian = await tx.guardian.create({
                data: {
                  guardianId: nextGuardianId,
                  schoolId: school.id,
                  profileId: null, // Will be linked when they accept invitation
                  firstName: guardianData.firstName,
                  lastName: guardianData.lastName,
                  otherNames: guardianData.otherNames,
                  email: guardianData.email,
                  phone: guardianData.phone,
                  alternatePhone: guardianData.alternatePhone,
                  gender: guardianData.gender,
                  relationshipType: guardianData.relationshipType,
                  occupation: guardianData.occupation,
                  employer: guardianData.employer,
                  workAddress: guardianData.workAddress,
                  workPhone: guardianData.workPhone,
                  residentialAddress: guardianData.residentialAddress,
                  city: guardianData.city,
                  region: guardianData.region,
                  canLogin: true,
                  isActive: true,
                },
              });

              console.log(
                `✓ [Guardian] Guardian record created (pending invitation)`,
              );
              needsInvitation = true;
            }
          }

          // Link guardian to student via GuardianStudent junction table
          console.log(`🔗 [Guardian] Linking to student...`);
          await tx.guardianStudent.create({
            data: {
              guardianId: guardian.id,
              studentId: newStudent.id,
              isPrimary: guardianData.isPrimary,
              canPickup: guardianData.canPickup,
              receiveReports: guardianData.receiveReports,
              receiveAlerts: guardianData.receiveAlerts,
            },
          });

          console.log(`✓ [Guardian] Successfully linked to student`);

          guardianResults.push({
            guardian,
            needsInvitation,
          });
        }

        console.log(
          `\n✅ [Guardians] Processed ${guardianResults.length} guardian(s)`,
        );
      }

      return {
        student: newStudent,
        guardianResults,
      };
    });

    console.log("✅ [Student Create] Transaction completed successfully");

    // Send invitations to guardians who need them (outside transaction)
    // Uses Better Auth's invitation system
    if (result.guardianResults.length > 0) {
      const guardiansNeedingInvitations = result.guardianResults.filter(
        (gr) => gr.needsInvitation,
      );

      if (guardiansNeedingInvitations.length > 0) {
        console.log(
          `\n📧 [Invitations] Sending ${guardiansNeedingInvitations.length} invitation(s) via Better Auth...`,
        );

        const invitationPromises = guardiansNeedingInvitations.map(
          async (gr) => {
            try {
              // ✅ FIX: Check if guardian email exists before creating invitation
              if (!gr.guardian.email) {
                console.warn(
                  `⚠️ [Invitation] Skipping guardian without email: ${gr.guardian.firstName} ${gr.guardian.lastName}`,
                );
                return;
              }

              console.log(
                `📤 [Invitation] Creating invitation for: ${gr.guardian.email}`,
              );

              // Create invitation via Better Auth
              // Better Auth will automatically send the email via the hook in auth.ts
              const invitation = await auth.api.createInvitation({
                body: {
                  organizationId: school.organizationId,
                  email: gr.guardian.email, // ✅ TypeScript now knows this is not null
                  role: "member",
                },
                headers: await headers(),
              });

              if (invitation) {
                console.log(
                  `✅ [Invitation] Created for ${gr.guardian.email} - Email will be sent by Better Auth hook`,
                );
              }
            } catch (error) {
              console.error(
                `❌ [Invitation] Error processing invitation for ${gr.guardian.email || "unknown"}:`,
                error,
              );
            }
          },
        );

        await Promise.all(invitationPromises);
        console.log("✅ [Invitations] All invitations processed");
      }
    }

    // Log audit trail
    console.log("📝 [Audit] Creating audit log...");
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entityType: "Student",
        entityId: result.student.id,
        newValues: {
          studentId: result.student.studentId,
          admissionNumber: result.student.admissionNumber,
          name: `${validatedData.firstName} ${validatedData.lastName}`,
          guardianCount: result.guardianResults.length,
          newInvitations: result.guardianResults.filter(
            (gr) => gr.needsInvitation,
          ).length,
        } as Prisma.InputJsonValue,
      },
    });

    console.log("✅ [Student Create] Process completed successfully!\n");

    return NextResponse.json(
      {
        ...result.student,
        guardians: result.guardianResults.map((gr) => ({
          id: gr.guardian.id,
          email: gr.guardian.email,
          name: `${gr.guardian.firstName} ${gr.guardian.lastName}`,
          invitationSent: gr.needsInvitation,
        })),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("❌ [Student Create] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (!role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const students = await prisma.student.findMany({
      where: { schoolId: school.id },
      include: {
        profile: true,
        class: {
          include: { academicYear: true },
        },
        department: true,
        house: true,
        _count: {
          select: {
            guardians: true,
            bills: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(students);
  } catch (error) {
    console.error("[STUDENTS_GET] Error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
