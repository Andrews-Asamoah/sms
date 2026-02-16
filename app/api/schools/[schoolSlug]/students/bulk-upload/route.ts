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
  const cleanFirst = firstName.toLowerCase().replace(/[^a-z]/g, "");
  const cleanLast = lastName.toLowerCase().replace(/[^a-z]/g, "");
  const cleanStudentId = studentId.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${cleanFirst}.${cleanLast}.${cleanStudentId}@${schoolSubdomain}.edu`;
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

  return rows.map((row) => ({
    firstName: String(row["First Name"] || "").trim(),
    lastName: String(row["Last Name"] || "").trim(),
    otherNames: row["Other Names"] ? String(row["Other Names"]).trim() : null,
    gender: String(row["Gender"] || "").toUpperCase() as Gender,
    dateOfBirth: String(row["Date of Birth"] || ""),
    nationality: row["Nationality"] ? String(row["Nationality"]).trim() : null,
    phone: row["Phone"] ? String(row["Phone"]) : null,
    alternatePhone: row["Alternate Phone"]
      ? String(row["Alternate Phone"])
      : null,
    residentialAddress: row["Residential Address"]
      ? String(row["Residential Address"]).trim()
      : null,
    postalAddress: row["Postal Address"]
      ? String(row["Postal Address"]).trim()
      : null,
    city: row["City"] ? String(row["City"]).trim() : null,
    region: row["Region"] ? String(row["Region"]).trim() : null,
    country: row["Country"] ? String(row["Country"]).trim() : null,
    admissionDate: String(row["Admission Date"] || ""),
    className: row["Class Name"] ? String(row["Class Name"]).trim() : null,
    departmentName: row["Department Name"]
      ? String(row["Department Name"]).trim()
      : null,
    houseName: row["House Name"] ? String(row["House Name"]).trim() : null,
    previousSchool: row["Previous School"]
      ? String(row["Previous School"]).trim()
      : null,
    previousClass: row["Previous Class"]
      ? String(row["Previous Class"]).trim()
      : null,
    bloodGroup: row["Blood Group"] ? String(row["Blood Group"]).trim() : null,
    allergies: row["Allergies"] ? String(row["Allergies"]).trim() : null,
    medicalConditions: row["Medical Conditions"]
      ? String(row["Medical Conditions"]).trim()
      : null,
    emergencyContactName: row["Emergency Contact Name"]
      ? String(row["Emergency Contact Name"]).trim()
      : null,
    emergencyContactPhone: row["Emergency Contact Phone"]
      ? String(row["Emergency Contact Phone"])
      : null,
    emergencyRelationship: row["Emergency Relationship"]
      ? String(row["Emergency Relationship"]).trim()
      : null,
    parentEmail: row["Parent Email"]
      ? String(row["Parent Email"]).trim().toLowerCase()
      : null,
    parentName: row["Parent Name"] ? String(row["Parent Name"]).trim() : null,
    parentPhone: row["Parent Phone"]
      ? String(row["Parent Phone"]).trim()
      : null,
    parentRelationship: row["Parent Relationship"]
      ? String(row["Parent Relationship"]).trim()
      : null,
  }));
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
      where: { id: schoolId },
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
        if (
          !row.firstName ||
          !row.lastName ||
          !row.gender ||
          !row.dateOfBirth ||
          !row.admissionDate
        ) {
          throw new Error("Missing required fields");
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
        // Create user via Better Auth
        // ====================================================================
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

        const userId = userResult.user.id;

        // ====================================================================
        // Add to organization with "student" role
        // ====================================================================
        await auth.api.addMember({
          body: {
            organizationId: school.organizationId,
            userId: userId,
            role: "member",
          },
        });

        // ====================================================================
        // Create UserProfile
        // ====================================================================
        const userProfile = await prisma.userProfile.create({
          data: {
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
        // Create Student record
        // ====================================================================
        const student = await prisma.student.create({
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

        // ====================================================================
        // Process parent/guardian if email provided
        // ====================================================================
        if (row.parentEmail && row.parentName) {
          const existingUser = await prisma.user.findUnique({
            where: { email: row.parentEmail },
          });

          let guardian;

          if (existingUser) {
            // Guardian exists - add to organization if needed
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
                  role: "member",
                },
              });
            }

            // Find or create guardian record
            guardian = await prisma.guardian.findFirst({
              where: {
                schoolId,
                email: row.parentEmail,
              },
            });

            if (!guardian) {
              const nameParts = row.parentName.trim().split(/\s+/);
              const firstName = nameParts[0] || "Parent";
              const lastName =
                nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

              const userProfile = await prisma.userProfile.findUnique({
                where: { userId: existingUser.id },
              });

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
                  profileId: userProfile?.id,
                  canLogin: true,
                },
              });
            }
          } else {
            // New guardian - create record first, then send invitation
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

            // Link to student BEFORE invitation
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

            // Send invitation (only once per unique email)
            // ✅ FIXED: Added headers parameter
            if (!guardianInvitations.has(row.parentEmail)) {
              await auth.api.createInvitation({
                body: {
                  email: row.parentEmail,
                  organizationId: school.organizationId,
                  role: "member",
                },
                headers: await headers(), // ✅ ADDED THIS
              });
              guardianInvitations.add(row.parentEmail);
            }
          }

          // Link guardian to student if not already linked
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
          status: "success",
        });

        console.log(`✅ [Bulk Upload] Row ${rowNumber}: Created ${studentId}`);
      } catch (error) {
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

        console.error(`❌ [Bulk Upload] Row ${rowNumber} failed:`, error);
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
