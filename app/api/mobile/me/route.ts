/**
 * GET /api/mobile/me
 *
 * Mobile-only authenticated profile endpoint.
 * Validates a Better Auth session token (passed as Bearer token in the
 * Authorization header) and returns a compact payload containing the
 * caller's role, linked school, and profile data.
 *
 * Security:
 *  - Token is validated server-side via Better Auth — no secret is exposed.
 *  - Only roles that are allowed to use the mobile app are permitted.
 *  - Banned users receive a 403.
 *
 * Usage (Flutter):
 *   Authorization: Bearer <session_token>
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Roles permitted to use the mobile app.
// Admin, owner, accountant are web-only.
const MOBILE_ALLOWED_ROLES = ["teacher", "student", "guardian"] as const;
type MobileRole = (typeof MOBILE_ALLOWED_ROLES)[number];

export async function GET(req: NextRequest) {
  try {
    // ------------------------------------------------------------------
    // 1. Extract Bearer token from Authorization header
    // ------------------------------------------------------------------
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or malformed Authorization header." },
        { status: 401 }
      );
    }
    const token = authHeader.slice(7); // strip "Bearer "

    // ------------------------------------------------------------------
    // 2. Validate token via Better Auth
    //    We forward it as a cookie so Better Auth can locate the session.
    // ------------------------------------------------------------------
    const sessionResponse = await auth.api.getSession({
      headers: new Headers({
        cookie: `better-auth.session_token=${token}`,
      }),
    });

    if (!sessionResponse) {
      return NextResponse.json(
        { error: "Invalid or expired session token." },
        { status: 401 }
      );
    }

    const { user, session } = sessionResponse;

    // ------------------------------------------------------------------
    // 3. Reject banned accounts
    // ------------------------------------------------------------------
    if (user.banned) {
      return NextResponse.json(
        {
          error: "Account suspended.",
          reason: user.banReason ?? "Contact your school administrator.",
        },
        { status: 403 }
      );
    }

    // ------------------------------------------------------------------
    // 4. Resolve the user's org membership → determines role + school
    //    Take the most recently created active membership.
    // ------------------------------------------------------------------
    const membership = await prisma.member.findFirst({
      where: { userId: user.id, banned: false },
      orderBy: { createdAt: "desc" },
      include: {
        organization: {
          include: {
            school: {
              select: {
                id: true,
                name: true,
                code: true,
                logo: true,
                primaryColor: true,
                currency: true,
                timezone: true,
              },
            },
          },
        },
      },
    });

    if (!membership?.organization.school) {
      return NextResponse.json(
        { error: "No school membership found for this account." },
        { status: 403 }
      );
    }

    const memberRole = membership.role.toLowerCase() as MobileRole;

    // ------------------------------------------------------------------
    // 5. Gate — only mobile-permitted roles may proceed
    // ------------------------------------------------------------------
    if (!MOBILE_ALLOWED_ROLES.includes(memberRole)) {
      return NextResponse.json(
        {
          error: "This account role is not permitted on the mobile app.",
          hint: "Admin and accountant accounts must use the web portal.",
        },
        { status: 403 }
      );
    }

    const school = membership.organization.school;

    // ------------------------------------------------------------------
    // 6. Fetch UserProfile + role-specific record
    //    Note: UserProfile has no `image` field — the photo lives on
    //    `user.image` (returned by Better Auth). Relations are fetched
    //    via `include`, not `select`, so TypeScript infers them correctly.
    // ------------------------------------------------------------------
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
      include: {
        // Teacher record (null if not a teacher)
        teacher: {
          select: {
            id: true,
            teacherId: true,
            staffNumber: true,
            departmentId: true,
            qualification: true,
            specialization: true,
            isActive: true,
            department: { select: { id: true, name: true } },
          },
        },
        // Student record (null if not a student)
        student: {
          select: {
            id: true,
            studentId: true,
            admissionNumber: true,
            classId: true,
            status: true,
            outstandingBalance: true,
            class: { select: { id: true, name: true } },
          },
        },
        // Guardian records — filtered to this school only
        guardians: {
          where: { schoolId: school.id },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            relationshipType: true,
            students: {
              select: {
                student: {
                  select: {
                    id: true,
                    studentId: true,
                    status: true,
                    outstandingBalance: true,
                    profile: {
                      select: {
                        firstName: true,
                        lastName: true,
                        // UserProfile has no image — use user.image via a
                        // separate lookup when needed; omit here to avoid error
                      },
                    },
                    class: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!userProfile) {
      return NextResponse.json(
        { error: "User profile not found. Please contact your administrator." },
        { status: 404 }
      );
    }

    // ------------------------------------------------------------------
    // 7. Build compact, role-specific response
    // ------------------------------------------------------------------
    const response = {
      userId: user.id,
      sessionToken: session.token,
      sessionExpiresAt: session.expiresAt,
      name: user.name,
      email: user.email,
      // `image` lives on the Better Auth `user` record, not on UserProfile
      image: user.image ?? null,
      role: memberRole,
      organizationId: membership.organizationId,
      school: {
        id: school.id,
        name: school.name,
        code: school.code,
        logo: school.logo,
        primaryColor: school.primaryColor,
        currency: school.currency,
        timezone: school.timezone,
      },
      profile: {
        id: userProfile.id,
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        otherNames: userProfile.otherNames,
        phone: userProfile.phone,
        gender: userProfile.gender,
        dateOfBirth: userProfile.dateOfBirth,
        // image is on user, not userProfile — return user.image here too
        image: user.image ?? null,
        city: userProfile.city,
        region: userProfile.region,
        isActive: userProfile.isActive,
      },
      // Role-specific data (null for non-matching roles)
      teacherData: memberRole === "teacher" ? userProfile.teacher : null,
      studentData: memberRole === "student" ? userProfile.student : null,
      guardianData:
        memberRole === "guardian" ? (userProfile.guardians[0] ?? null) : null,
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        // Mobile clients may cache this briefly to reduce DB load
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    console.error("[Mobile /me] Unhandled error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// Only GET is supported on this endpoint
export async function POST() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}
