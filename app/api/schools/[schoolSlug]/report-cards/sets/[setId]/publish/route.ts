import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { verifyApiSchoolAccess } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ schoolSlug: string; setId: string }> },
) {
  try {
    const { schoolSlug, setId } = await params;
    const access = await verifyApiSchoolAccess(schoolSlug, ["owner", "admin", "headteacher"]);
    if (!access.authorized) return access.errorResponse;
    const { session } = access;


    const set = await prisma.reportCardSet.findUnique({
      where: { id: setId },
      include: {
        reportCards: {
          include: {
            student: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    if (!set) {
      return new NextResponse("Report card set not found", { status: 404 });
    }

    // Update the set status and publishedAt for all reports
    await prisma.$transaction([
      prisma.reportCardSet.update({
        where: { id: setId },
        data: { status: "PUBLISHED" },
      }),
      prisma.reportCard.updateMany({
        where: { setId },
        data: { publishedAt: new Date() },
      }),
    ]);

    // Create notifications for each student in bulk outside the transaction block
    const notificationData = set.reportCards
      .filter((rc) => rc.student?.profile?.userId)
      .map((rc) => ({
        schoolId: set.schoolId,
        userId: rc.student.profile.userId,
        type: "RESULT_PUBLISHED" as const,
        title: "Results Published",
        message: `Results for ${set.name} have been published.`,
        link: `/${schoolSlug}/student/reports/${rc.id}`,
      }));

    if (notificationData.length > 0) {
      await prisma.notification.createMany({
        data: notificationData,
      });
    }


    revalidatePath(`/${schoolSlug}/admin/reports/report-cards`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[REPORT_CARD_PUBLISH_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
