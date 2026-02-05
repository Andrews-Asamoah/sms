// app/api/schools/[schoolSlug]/students/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import {
  generateStudentId,
  generateAdmissionNumber,
} from "@/lib/utils/student-ids";

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
});

export async function POST(
  request: NextRequest,
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

    const body = await request.json();
    const validatedData = createStudentSchema.parse(body);

    // Verify school exists
    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug, id: validatedData.schoolId },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // Generate student ID if not provided
    const studentId =
      validatedData.studentId || (await generateStudentId(school.id));

    // Generate admission number if not provided
    const admissionNumber =
      validatedData.admissionNumber ||
      (await generateAdmissionNumber(school.id, school.code));

    // Check if studentId already exists
    const existingStudent = await prisma.student.findFirst({
      where: {
        studentId,
        schoolId: school.id,
      },
    });

    if (existingStudent) {
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
      return NextResponse.json(
        { error: "Admission number already exists" },
        { status: 400 },
      );
    }

    // Create student with profile in a transaction
    const student = await prisma.$transaction(async (tx) => {
      // First, create a temporary user account for the student
      // This user will be used to link the profile
      const tempUser = await tx.user.create({
        data: {
          name: `${validatedData.firstName} ${validatedData.lastName}`,
          email: `${studentId.toLowerCase()}@temp.${school.subdomain}.edu`, // Temporary email
          emailVerified: false,
          role: "user", // Default role
        },
      });

      // Create user profile for the student
      const profile = await tx.userProfile.create({
        data: {
          userId: tempUser.id, // Use the temporary user ID
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

      // Create student record with auto-generated IDs
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

      return newStudent;
    });

    // Log audit trail
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entityType: "Student",
        entityId: student.id,
        newValues: {
          studentId: student.studentId,
          admissionNumber: student.admissionNumber,
          name: `${validatedData.firstName} ${validatedData.lastName}`,
        },
      },
    });

    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    console.error("[STUDENTS_POST] Error", error);

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
