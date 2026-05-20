import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendSubscriptionAlertEmail } from "@/lib/email/resend";
import { addDays, startOfDay, endOfDay } from "date-fns";

/**
 * Triggered via Vercel Cron or similar service
 * Scans for schools expiring exactly 7 days from now
 */
export async function GET(request: Request) {
  // Simple auth check for CRON_SECRET if available
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const sevenDaysFromNow = addDays(new Date(), 7);
    const startOfTargetDay = startOfDay(sevenDaysFromNow);
    const endOfTargetDay = endOfDay(sevenDaysFromNow);

    console.log(`[Cron] Scanning for subscriptions expiring between ${startOfTargetDay} and ${endOfTargetDay}`);

    // High performance query: Index on subscriptionStatus exists
    const organizations = await prisma.organization.findMany({
      where: {
        expiresAt: {
          gte: startOfTargetDay,
          lte: endOfTargetDay,
        },
        subscriptionStatus: {
          in: ["ACTIVE", "TRIALING"]
        }
      },
      include: {
        members: {
          where: {
            role: { in: ["owner", "admin"] }
          },
          include: {
            user: true
          }
        },
        school: {
          include: {
            subscription: true
          }
        }
      }
    });

    console.log(`[Cron] Found ${organizations.length} organizations approaching expiry.`);

    const results = await Promise.allSettled(
      organizations.map(async (org) => {
        const schoolName = org.school?.name || org.name;
        const schoolSlug = org.school?.subdomain || org.slug;
        const billingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/${schoolSlug}/admin/subscription`;

        // Send to all owners/admins
        const emailPromises = org.members.map(member => 
          sendSubscriptionAlertEmail({
            to: member.user.email,
            schoolName,
            daysRemaining: 7,
            expiryDate: org.expiresAt!,
            billingUrl
          })
        );

        // Also create in-app notifications
        const notificationPromise = prisma.notification.createMany({
          data: org.members.map(member => ({
            userId: member.userId,
            schoolId: org.school?.id || '',
            title: "Subscription Expiring Soon",
            message: `Your subscription for ${schoolName} will expire in 7 days. Please renew to avoid service interruption.`,
            type: "FEE_REMINDER" as const,
            priority: "HIGH" as const,
          })).filter(n => n.schoolId !== '')
        });

        // Generate PENDING Invoice for the upcoming billing cycle if one does not exist
        const sub = org.school?.subscription;
        let invoicePromise = Promise.resolve();
        if (sub) {
          invoicePromise = (async () => {
            const existingPendingInvoice = await prisma.invoiceRecord.findFirst({
              where: {
                subscriptionId: sub.id,
                status: "PENDING",
              },
            });

            if (!existingPendingInvoice) {
              // Calculate upcoming period dates
              const periodStart = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : new Date();
              const periodEnd = new Date(periodStart);
              if (sub.billingCycle === "YEARLY") {
                periodEnd.setFullYear(periodEnd.getFullYear() + 1);
              } else {
                periodEnd.setMonth(periodEnd.getMonth() + 1);
              }

              await prisma.invoiceRecord.create({
                data: {
                  subscriptionId: sub.id,
                  invoiceNumber: `INV-PEND-${sub.id}-${Date.now()}`,
                  amount: sub.amount ?? 99.0,
                  currency: sub.currency ?? "GHS",
                  status: "PENDING",
                  periodStart,
                  periodEnd,
                },
              }).catch((e) => {
                console.error(`[Cron Alert] Failed to auto-generate PENDING invoice for subscription ${sub.id}:`, e);
              });
            }
          })();
        }

        return Promise.all([...emailPromises, notificationPromise, invoicePromise]);
      })
    );

    return NextResponse.json({
      success: true,
      processed: organizations.length,
      details: results.map(r => r.status)
    });

  } catch (error) {
    console.error("[Cron] Error processing subscription alerts:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
