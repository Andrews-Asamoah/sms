// app/api/schools/[schoolSlug]/students/bulk-upload/route.ts - CORRECTED
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import crypto from "crypto";
import * as XLSX from "xlsx";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import type { Gender, GuardianType } from "@/lib/generated/prisma/client";
import { headers } from "next/headers"; // ✅ ADD THIS IMPORT

// ============================================================================
// TYPES
// ============================================================================

interface StudentRow {
  firstName: string;
  lastName: string;
  otherNames?: string | null;
  gender: Gender;
  dateOfBirth: string;
  nationality?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
  residentialAddress?: string | null;
  postalAddress?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  admissionDate: string;
  className?: string | null;
  departmentName?: string | null;
  houseName?: string | null;
  previousSchool?: string | null;
  previousClass?: string | null;
  bloodGroup?: string | null;
  allergies?: string | null;
  medicalConditions?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyRelationship?: string | null;
  parentEmail?: string | null;
  parentName?: string | null;
  parentPhone?: string | null;
  parentRelationship?: string | null;
}

interface ProcessResult {
  row: number;
  studentId: string;
  admissionNumber: string;
  name: string;
  email: string;
  password?: string;
  status: "success" | "error";
  message?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateStudentEmail(
  firstName: string,
  lastName: string,
  studentId: string,
  schoolSubdomain: string,
): string {
  const firstInitial = firstName
    .charAt(0)
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  const cleanLast = lastName.toLowerCase().replace(/[^a-z]/g, "");
  const shortId = studentId.replace(/\D/g, "").slice(-3) || "001";
  return `${firstInitial}.${cleanLast}.${shortId}@${schoolSubdomain}.sms`;
}

function generateSecurePassword(): string {
  return crypto.randomBytes(16).toString("base64").slice(0, 16);
}

function parseGuardianRelationship(
  relationship: string | null | undefined,
): GuardianType {
  if (!relationship) return "OTHER";

  const upperRelationship = relationship.toUpperCase();

  // Map to GuardianType enum values
  switch (upperRelationship) {
    case "FATHER":
      return "FATHER";
    case "MOTHER":
      return "MOTHER";
    case "GUARDIAN":
      return "GUARDIAN";
    case "SIBLING":
      return "SIBLING";
    case "RELATIVE":
      return "RELATIVE";
    default:
      return "OTHER";
  }
}

// ============================================================================
// EXCEL PARSING
// ============================================================================

function parseExcelFile(buffer: Buffer): StudentRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json(sheet, { raw: false }) as Record<
    string,
    unknown
  >[];

  const getVal = (row: Record<string, any>, ...keys: string[]) => {
    for (const key of keys) {
      if (row[key] !== undefined) return row[key];
      // Try ultra-flexible match: lowercase and alphanumeric only
      const normalizedReq = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      const actualKey = Object.keys(row).find((k) => {
        const normalizedActual = k.toLowerCase().replace(/[^a-z0-9]/g, "");
        return normalizedActual === normalizedReq;
      });
      if (actualKey) return row[actualKey];
    }

    // Log normalization debug info for first row if it fails to find any of the main keys
    const isMainKey = keys.some((k) =>
      [
        "First Name",
        "Last Name",
        "Gender",
        "Date of Birth",
        "Admission Date",
      ].includes(k),
    );
    if (isMainKey && rows.indexOf(row) === 0) {
      console.warn(
        `⚠️ [Bulk Upload Debug] Failed to find key: ${keys[0]}. Normalized keys in row:`,
        Object.keys(row).map(
          (k) => `${k} -> ${k.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
        ),
      );
    }
    return undefined;
  };

  if (rows.length > 0) {
    console.log("🔍 [Bulk Upload Debug] First row keys:", Object.keys(rows[0]));
  }

  return rows.map((row, index) => {
    const firstName = String(
      getVal(row, "First Name", "FirstName") || "",
    ).trim();
    const lastName = String(getVal(row, "Last Name", "LastName") || "").trim();
    const gender = String(getVal(row, "Gender") || "").toUpperCase() as Gender;
    const dateOfBirth = String(
      getVal(row, "Date of Birth", "DOB", "BirthDate") || "",
    );
    const admissionDate = String(
      getVal(row, "Admission Date", "Date of Admission") || "",
    );

    if (index === 0) {
      console.log(`🔍 [Bulk Upload Debug] Extracted for row ${index + 2}:`, {
        firstName,
        lastName,
        gender,
        dateOfBirth,
        admissionDate,
      });
    }

    return {
      firstName,
      lastName,
      otherNames: getVal(row, "Other Names", "OtherNames")
        ? String(getVal(row, "Other Names", "OtherNames")).trim()
        : null,
      gender,
      dateOfBirth,
      nationality: getVal(row, "Nationality")
        ? String(getVal(row, "Nationality")).trim()
        : null,
      phone: getVal(row, "Phone") ? String(getVal(row, "Phone")) : null,
      alternatePhone: getVal(row, "Alternate Phone", "Alt Phone")
        ? String(getVal(row, "Alternate Phone", "Alt Phone"))
        : null,
      residentialAddress: getVal(row, "Residential Address")
        ? String(getVal(row, "Residential Address")).trim()
        : null,
      postalAddress: getVal(row, "Postal Address")
        ? String(getVal(row, "Postal Address")).trim()
        : null,
      city: getVal(row, "City") ? String(getVal(row, "City")).trim() : null,
      region: getVal(row, "Region")
        ? String(getVal(row, "Region")).trim()
        : null,
      country: getVal(row, "Country")
        ? String(getVal(row, "Country")).trim()
        : null,
      admissionDate,
      className: getVal(row, "Class Name", "Class")
        ? String(getVal(row, "Class Name", "Class")).trim()
        : null,
      departmentName: getVal(row, "Department Name", "Department")
        ? String(getVal(row, "Department Name", "Department")).trim()
        : null,
      houseName: getVal(row, "House Name", "House")
        ? String(getVal(row, "House Name", "House")).trim()
        : null,
      previousSchool: getVal(row, "Previous School")
        ? String(getVal(row, "Previous School")).trim()
        : null,
      previousClass: getVal(row, "Previous Class")
        ? String(getVal(row, "Previous Class")).trim()
        : null,
      bloodGroup: getVal(row, "Blood Group")
        ? String(getVal(row, "Blood Group")).trim()
        : null,
      allergies: getVal(row, "Allergies")
        ? String(getVal(row, "Allergies")).trim()
        : null,
      medicalConditions: getVal(row, "Medical Conditions")
        ? String(getVal(row, "Medical Conditions")).trim()
        : null,
      emergencyContactName: getVal(row, "Emergency Contact Name")
        ? String(getVal(row, "Emergency Contact Name")).trim()
        : null,
      emergencyContactPhone: getVal(row, "Emergency Contact Phone")
        ? String(getVal(row, "Emergency Contact Phone"))
        : null,
      emergencyRelationship: getVal(row, "Emergency Relationship")
        ? String(getVal(row, "Emergency Relationship")).trim()
        : null,
      parentEmail: getVal(row, "Parent Email", "Guardian Email")
        ? String(getVal(row, "Parent Email", "Guardian Email"))
            .trim()
            .toLowerCase()
        : null,
      parentName: getVal(row, "Parent Name", "Guardian Name")
        ? String(getVal(row, "Parent Name", "Guardian Name")).trim()
        : null,
      parentPhone: getVal(row, "Parent Phone", "Guardian Phone")
        ? String(getVal(row, "Parent Phone", "Guardian Phone")).trim()
        : null,
      parentRelationship: getVal(
        row,
        "Parent Relationship",
        "Guardian Relationship",
      )
        ? String(
            getVal(row, "Parent Relationship", "Guardian Relationship"),
          ).trim()
        : null,
    };
  });
}

// ============================================================================
// MAIN API HANDLER
// ============================================================================

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  try {
    const { schoolSlug } = await params;

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

    // Only admin/owner can bulk upload
    if (
      schoolAccess.effectiveRole !== "admin" &&
      schoolAccess.effectiveRole !== "owner" &&
      !session.isSuperAdmin
    ) {
      return NextResponse.json(
        { error: "Only administrators can perform bulk uploads" },
        { status: 403 },
      );
    }

    // ========================================================================
    // STEP 2: Parse form data
    // ========================================================================
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const schoolId = formData.get("schoolId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // ========================================================================
    // STEP 3: Fetch school
    // ========================================================================
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      include: {
        classes: true,
        departments: true,
        houses: true,
      },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    console.log(`📊 [Bulk Upload] Processing file for ${school.name}`);

    // ========================================================================
    // STEP 4: Parse Excel file
    // ========================================================================
    const buffer = Buffer.from(await file.arrayBuffer());
    const studentRows = parseExcelFile(buffer);

    if (studentRows.length === 0) {
      return NextResponse.json(
        { error: "No student data found in file" },
        { status: 400 },
      );
    }

    console.log(
      `📋 [Bulk Upload] Found ${studentRows.length} students to process`,
    );

    // ========================================================================
    // STEP 5: Process students
    // ========================================================================
    const results: ProcessResult[] = [];
    const guardianInvitations = new Set<string>(); // Track unique guardian emails

    // Get last student number for ID generation
    const lastStudent = await prisma.student.findFirst({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
      select: { studentId: true, admissionNumber: true },
    });

    let nextStudentNumber = lastStudent
      ? parseInt(lastStudent.studentId.replace(/\D/g, "")) + 1
      : 1;

    let nextAdmissionNumber = lastStudent?.admissionNumber
      ? parseInt(lastStudent.admissionNumber.replace(/\D/g, "")) + 1
      : 1;

    for (let i = 0; i < studentRows.length; i++) {
      const row = studentRows[i];
      const rowNumber = i + 2; // Account for header row

      try {
        // ====================================================================
        // Validate required fields
        // ====================================================================
        const missingFields = [];
        if (!row.firstName) missingFields.push("First Name");
        if (!row.lastName) missingFields.push("Last Name");
        if (!row.gender) missingFields.push("Gender");
        if (!row.dateOfBirth) missingFields.push("Date of Birth");
        if (!row.admissionDate) missingFields.push("Admission Date");

        if (missingFields.length > 0) {
          throw new Error(
            `Missing required fields: ${missingFields.join(", ")}`,
          );
        }

        // ====================================================================
        // Generate IDs
        // ====================================================================
        const studentId = `STU${nextStudentNumber.toString().padStart(5, "0")}`;
        const admissionNumber = `${school.code}${nextAdmissionNumber.toString().padStart(4, "0")}`;
        nextStudentNumber++;
        nextAdmissionNumber++;

        // ====================================================================
        // Generate credentials
        // ====================================================================
        const studentEmail = generateStudentEmail(
          row.firstName,
          row.lastName,
          studentId,
          school.subdomain,
        );
        const temporaryPassword = generateSecurePassword();

        // ====================================================================
        // Find class, department, house by name
        // ====================================================================
        const classRecord = row.className
          ? school.classes.find((c) => c.name === row.className)
          : null;
        const department = row.departmentName
          ? school.departments.find((d) => d.name === row.departmentName)
          : null;
        const house = row.houseName
          ? school.houses.find((h) => h.name === row.houseName)
          : null;

        // ====================================================================
        // Check for existing student ID or Admission Number
        // ====================================================================
        const existingStudent = await prisma.student.findFirst({
          where: {
            schoolId,
            OR: [{ studentId }, { admissionNumber }],
          },
        });

        if (existingStudent) {
          throw new Error(
            `Student ID (${studentId}) or Admission Number (${admissionNumber}) already exists`,
          );
        }

        // ====================================================================
        // Check if user already exists
        // ====================================================================
        const existingUser = await prisma.user.findUnique({
          where: { email: studentEmail },
        });

        let userId: string;

        if (existingUser) {
          // If user exists, check if they are already a member of this school
          const existingMember = await prisma.member.findFirst({
            where: {
              organizationId: school.organizationId,
              userId: existingUser.id,
            },
          });

          if (existingMember) {
            // Check if they are already a student
            const studentExists = await prisma.student.findFirst({
              where: {
                schoolId,
                profile: { userId: existingUser.id },
              },
            });

            if (studentExists) {
              throw new Error(
                `Student with email ${studentEmail} already exists in this school`,
              );
            }
          }
          userId = existingUser.id;
        } else {
          // Create user via Better Auth
          const userResult = await auth.api.signUpEmail({
            body: {
              email: studentEmail,
              password: temporaryPassword,
              name: `${row.firstName} ${row.lastName}`,
            },
          });

          if (!userResult) {
            throw new Error("Failed to create user account");
          }
          userId = userResult.user.id;
        }

        // ====================================================================
        // Add to organization if not already a member
        // ====================================================================
        const member = await prisma.member.findFirst({
          where: {
            organizationId: school.organizationId,
            userId: userId,
          },
        });

        if (!member) {
          await auth.api.addMember({
            body: {
              organizationId: school.organizationId,
              userId: userId,
              role: "student",
            },
          });
        }

        // ====================================================================
        // Create or Update UserProfile
        // ====================================================================
        const userProfile = await prisma.userProfile.upsert({
          where: { userId },
          update: {
            firstName: row.firstName,
            lastName: row.lastName,
            otherNames: row.otherNames,
            gender: row.gender,
            dateOfBirth: new Date(row.dateOfBirth),
            nationality: row.nationality,
            phone: row.phone,
            alternatePhone: row.alternatePhone,
            residentialAddress: row.residentialAddress,
            postalAddress: row.postalAddress,
            city: row.city,
            region: row.region,
            country: row.country,
            emergencyContactName: row.emergencyContactName,
            emergencyContactPhone: row.emergencyContactPhone,
            emergencyRelationship: row.emergencyRelationship,
          },
          create: {
            userId,
            firstName: row.firstName,
            lastName: row.lastName,
            otherNames: row.otherNames,
            gender: row.gender,
            dateOfBirth: new Date(row.dateOfBirth),
            nationality: row.nationality,
            phone: row.phone,
            alternatePhone: row.alternatePhone,
            residentialAddress: row.residentialAddress,
            postalAddress: row.postalAddress,
            city: row.city,
            region: row.region,
            country: row.country,
            emergencyContactName: row.emergencyContactName,
            emergencyContactPhone: row.emergencyContactPhone,
            emergencyRelationship: row.emergencyRelationship,
          },
        });

        // ====================================================================
        // Create or Update Student record
        // ====================================================================
        let student = await prisma.student.findFirst({
          where: {
            schoolId,
            profileId: userProfile.id,
          },
        });

        if (!student) {
          student = await prisma.student.create({
            data: {
              schoolId,
              profileId: userProfile.id,
              studentId,
              admissionNumber,
              admissionDate: new Date(row.admissionDate),
              classId: classRecord?.id || null,
              departmentId: department?.id || null,
              houseId: house?.id || null,
              previousSchool: row.previousSchool,
              previousClass: row.previousClass,
              bloodGroup: row.bloodGroup,
              allergies: row.allergies,
              medicalConditions: row.medicalConditions,
              status: "ACTIVE",
            },
          });
          console.log(
            `✅ [Bulk Upload] Row ${rowNumber}: Created new student ${studentId}`,
          );
        } else {
          // Update existing student record
          student = await prisma.student.update({
            where: { id: student.id },
            data: {
              classId: classRecord?.id || student.classId,
              departmentId: department?.id || student.departmentId,
              houseId: house?.id || student.houseId,
              previousSchool: row.previousSchool || student.previousSchool,
              previousClass: row.previousClass || student.previousClass,
              bloodGroup: row.bloodGroup || student.bloodGroup,
              allergies: row.allergies || student.allergies,
              medicalConditions:
                row.medicalConditions || student.medicalConditions,
            },
          });
          console.log(
            `✅ [Bulk Upload] Row ${rowNumber}: Updated existing student ${student.studentId}`,
          );
        }

        // ====================================================================
        // Process parent/guardian if email provided
        // ====================================================================
        // ====================================================================
        // Process parent/guardian if email provided
        // ====================================================================
        if (row.parentEmail && row.parentName) {
          // 1. Check if user already exists
          const existingUser = await prisma.user.findUnique({
            where: { email: row.parentEmail },
            include: { userProfile: true },
          });

          let guardian;

          // 2. Check if guardian record already exists in this school
          guardian = await prisma.guardian.findFirst({
            where: {
              schoolId,
              email: row.parentEmail,
            },
          });

          if (existingUser) {
            // Ensure organization membership
            const existingMembership = await prisma.member.findFirst({
              where: {
                userId: existingUser.id,
                organizationId: school.organizationId,
              },
            });

            if (!existingMembership) {
              await auth.api.addMember({
                body: {
                  organizationId: school.organizationId,
                  userId: existingUser.id,
                  role: "guardian",
                },
              });
            }

            if (!guardian) {
              const nameParts = row.parentName.trim().split(/\s+/);
              const firstName = nameParts[0] || "Parent";
              const lastName =
                nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

              guardian = await prisma.guardian.create({
                data: {
                  schoolId,
                  guardianId: crypto.randomUUID(),
                  firstName,
                  lastName,
                  email: row.parentEmail,
                  phone: row.parentPhone || "",
                  relationshipType: parseGuardianRelationship(
                    row.parentRelationship,
                  ),
                  profileId: existingUser.userProfile?.id,
                  canLogin: true,
                },
              });
            }
          } else {
            // No user account yet
            if (!guardian) {
              const nameParts = row.parentName.trim().split(/\s+/);
              const firstName = nameParts[0] || "Parent";
              const lastName =
                nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

              guardian = await prisma.guardian.create({
                data: {
                  schoolId,
                  guardianId: crypto.randomUUID(),
                  firstName,
                  lastName,
                  email: row.parentEmail,
                  phone: row.parentPhone || "",
                  relationshipType: parseGuardianRelationship(
                    row.parentRelationship,
                  ),
                  canLogin: true,
                },
              });
            }

            // Send invitation if not already sent in this batch
            if (!guardianInvitations.has(row.parentEmail)) {
              // We should probably check if an invitation already exists in the DB too
              const existingInvite = await prisma.invitation.findFirst({
                where: {
                  email: row.parentEmail,
                  organizationId: school.organizationId,
                  status: "pending",
                },
              });

              if (!existingInvite) {
                await auth.api.createInvitation({
                  body: {
                    email: row.parentEmail,
                    organizationId: school.organizationId,
                    role: "guardian",
                  },
                  headers: await headers(),
                });
              }
              guardianInvitations.add(row.parentEmail);
            }
          }

          // 3. Link guardian to student
          const existingLink = await prisma.guardianStudent.findUnique({
            where: {
              guardianId_studentId: {
                guardianId: guardian.id,
                studentId: student.id,
              },
            },
          });

          if (!existingLink) {
            await prisma.guardianStudent.create({
              data: {
                guardianId: guardian.id,
                studentId: student.id,
                isPrimary: true,
                canPickup: true,
                receiveReports: true,
                receiveAlerts: true,
              },
            });
          }
        }

        results.push({
          row: rowNumber,
          studentId,
          admissionNumber,
          name: `${row.firstName} ${row.lastName}`,
          email: studentEmail,
          password: temporaryPassword,
          status: "success",
        });

        console.log(`✅ [Bulk Upload] Row ${rowNumber}: Created ${studentId}`);
      } catch (error: any) {
        console.error(`❌ [Bulk Upload] Row ${rowNumber} failed:`, error);
        if (error.code === "P2002") {
          console.error(
            "🔍 [Bulk Upload Debug] Unique constraint violation meta:",
            error.meta,
          );
        }
        results.push({
          row: rowNumber,
          studentId: "",
          admissionNumber: "",
          name:
            row.firstName && row.lastName
              ? `${row.firstName} ${row.lastName}`
              : "Unknown",
          email: "",
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // ========================================================================
    // STEP 6: Create audit log
    // ========================================================================
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entityType: "STUDENT",
        entityId: "BULK_UPLOAD",
        newValues: {
          schoolId,
          totalStudents: results.length,
          successful: results.filter((r) => r.status === "success").length,
          failed: results.filter((r) => r.status === "error").length,
          guardianInvitationsSent: guardianInvitations.size,
          uploadedBy: session.user.email,
        },
      },
    });

    // ========================================================================
    // RESPONSE
    // ========================================================================
    const successful = results.filter((r) => r.status === "success").length;
    const failed = results.filter((r) => r.status === "error").length;

    console.log(
      `📊 [Bulk Upload] Complete: ${successful} success, ${failed} failed`,
    );

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: results.length,
        successful,
        failed,
        guardianInvitationsSent: guardianInvitations.size,
      },
      message: `Bulk upload complete. ${successful} students created successfully. Guardian invitations sent to ${guardianInvitations.size} parent(s)/guardian(s).`,
    });
  } catch (error) {
    console.error("[Bulk Upload] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to process bulk upload",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
