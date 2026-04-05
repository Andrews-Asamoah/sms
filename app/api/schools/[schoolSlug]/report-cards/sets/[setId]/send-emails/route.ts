import { requireSchoolAccess } from "@/lib/auth/guards";
import { getSchoolRole } from "@/lib/auth/school-access";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { render } from "@react-email/render";
import { ReportCardEmail } from "@/lib/email/templates/report-card-notification";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@yourdomain.com";

const bodySchema = z.object({
  classId: z.string().optional(),
});

export async function POST(
  request: Request,
  {
    params,
  }: { params: Promise<{ schoolSlug: string; setId: string }> },
) {
  try {
    const { schoolSlug, setId } = await params;
    const session = await requireSchoolAccess(schoolSlug);
    const role = getSchoolRole(session, schoolSlug);

    if (
      role?.effectiveRole !== "admin" &&
      role?.effectiveRole !== "owner" &&
      !session.isSuperAdmin
    ) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { classId } = bodySchema.parse(body);

    const school = await prisma.school.findUnique({
      where: { subdomain: schoolSlug },
      select: { id: true, name: true, logo: true },
    });
    if (!school) return new NextResponse("School not found", { status: 404 });

    // Find all published report cards in the set (optionally filtered by class)
    const reportCards = await prisma.reportCard.findMany({
      where: {
        setId,
        publishedAt: { not: null },
        ...(classId
          ? {
              student: {
                classId,
              },
            }
          : {}),
      },
      include: {
        student: {
          include: {
            profile: true,
            class: { select: { name: true } },
            guardians: {
              where: { isPrimary: true },
              include: {
                guardian: {
                  select: { firstName: true, lastName: true, email: true },
                },
              },
            },
          },
        },
        set: {
          include: {
            academicYear: { select: { name: true } },
            term: { select: { name: true } },
          },
        },
      },
    });

    let sent = 0;
    const errors: string[] = [];

    for (const rc of reportCards) {
      const data = rc.data as any;
      const student = rc.student;
      const primaryGuardian = student.guardians[0]?.guardian;

      if (!primaryGuardian?.email) continue;

      try {
        const html = await render(
          ReportCardEmail({
            guardianName: `${primaryGuardian.firstName} ${primaryGuardian.lastName}`,
            studentName: `${student.profile.firstName} ${student.profile.lastName}`,
            className: student.class?.name ?? data?.class ?? "",
            termName: rc.set.term.name,
            academicYear: rc.set.academicYear.name,
            schoolName: school.name,
            schoolLogo: school.logo ?? undefined,
            average: data?.average != null ? Math.round(data.average) : null,
            position: data?.position ?? null,
            positionSuffix: data?.positionSuffix ?? "",
            subjects: (data?.subjects ?? []).slice(0, 8).map((s: any) => ({
              name: s.subjectName,
              score: s.totalScore,
              grade: s.grade,
            })),
            portalUrl: `${process.env.NEXT_PUBLIC_APP_URL}/${schoolSlug}/guardian/reports`,
          }),
        );

        await resend.emails.send({
          from: FROM_EMAIL,
          to: primaryGuardian.email,
          subject: `${student.profile.firstName}'s Report Card — ${rc.set.term.name}, ${rc.set.academicYear.name}`,
          html,
        });
        sent++;
      } catch (err) {
        console.error(`Failed to send to ${primaryGuardian.email}:`, err);
        errors.push(primaryGuardian.email);
      }
    }

    return NextResponse.json({ sent, failed: errors.length, errors });
  } catch (error) {
    console.error("[SEND_EMAILS]", error);
    if (error instanceof z.ZodError) {
      return new NextResponse("Invalid body", { status: 400 });
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
}
