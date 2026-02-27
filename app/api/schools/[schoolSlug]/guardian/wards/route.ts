import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { getSchoolRole } from "@/lib/auth/school-access";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolSlug: string }> },
) {
  const { schoolSlug } = await params;
  const session = await getSession();

  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const access = getSchoolRole(session, schoolSlug);

  if (
    !access ||
    (!access.profileRoles.includes("guardian") &&
      access.effectiveRole !== "guardian")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const guardian = await prisma.guardian.findFirst({
    where: { profileId: session.user.id, school: { subdomain: schoolSlug } },
    include: {
      students: {
        include: {
          student: {
            select: { id: true, profile: true, outstandingBalance: true },
          },
        },
      },
    },
  });

  if (!guardian)
    return NextResponse.json({ error: "Guardian not found" }, { status: 404 });

  const wards = guardian.students.map((gs) => ({
    id: gs.student.id,
    firstName: gs.student.profile.firstName,
    lastName: gs.student.profile.lastName,
    outstandingBalance: Number(gs.student.outstandingBalance),
  }));

  return NextResponse.json(wards);
}
