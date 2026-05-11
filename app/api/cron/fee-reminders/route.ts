// app/api/cron/fee-reminders/route.ts
// Triggered daily by Vercel Cron or external scheduler
// vercel.json: { "crons": [{ "path": "/api/cron/fee-reminders", "schedule": "0 6 * * *" }] }
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { processReminderSend } from "@/app/api/schools/[schoolSlug]/fee-reminders/[scheduleId]/route";
import { startOfDay, endOfDay } from "date-fns";

export async function GET(request: Request) {
  // Auth check
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const today = new Date();
  const start = startOfDay(today);
  const end = endOfDay(today);

  console.log(`[CronFeeReminders] Running for date: ${today.toISOString()}`);

  try {
    // Find all installments scheduled to send today that haven't been sent yet
    const dueInstallments = await prisma.feeReminderInstallment.findMany({
      where: {
        sendDate: { gte: start, lte: end },
        sent: false,
        schedule: { isActive: true },
      },
      include: {
        schedule: {
          include: {
            school: { select: { id: true, name: true, currency: true, subdomain: true } },
          },
        },
      },
    });

    console.log(`[CronFeeReminders] Found ${dueInstallments.length} installment(s) to process.`);

    if (dueInstallments.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: "No installments due today." });
    }

    const results = await Promise.allSettled(
      dueInstallments.map(async (installment) => {
        const { schedule } = installment;
        const school = schedule.school;

        console.log(`[CronFeeReminders] Processing: "${schedule.name}" — installment "${installment.label}" for school "${school.name}"`);

        const result = await processReminderSend({
          schedule,
          installment,
          school: { id: school.id, name: school.name, currency: school.currency },
          schoolSlug: school.subdomain,
          isManual: false,
        });

        return { scheduleId: schedule.id, installmentId: installment.id, installmentLabel: installment.label, schoolName: school.name, ...result };
      })
    );

    const summary = results.map((r, i) => ({
      installment: dueInstallments[i].label,
      status: r.status,
      ...(r.status === "fulfilled" ? r.value : { error: String(r.reason) }),
    }));

    const successCount = results.filter((r) => r.status === "fulfilled").length;
    console.log(`[CronFeeReminders] Done. ${successCount}/${dueInstallments.length} succeeded.`);

    return NextResponse.json({
      success: true,
      processed: dueInstallments.length,
      succeeded: successCount,
      failed: dueInstallments.length - successCount,
      summary,
    });
  } catch (error) {
    console.error("[CronFeeReminders] Fatal error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
