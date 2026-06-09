import { Suspense } from "react";
import { FeeReminderScheduler } from "@/components/school/fee-reminder-scheduler";
import { getSession } from "@/lib/auth/session";
import { hasSchoolAccess } from "@/lib/auth/school-access";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Fee Reminder Schedules | Accountant Portal",
  description: "Manage automated fee reminder schedules for parents with outstanding balances.",
};

interface AccountantFeeRemindersPageProps {
  params: Promise<{ schoolSlug: string }>;
}

export default async function AccountantFeeRemindersPage({
  params,
}: AccountantFeeRemindersPageProps) {
  const { schoolSlug } = await params;
  return (
    <Suspense fallback={<FeeRemindersSkeleton />}>
      <FeeRemindersContent schoolSlug={schoolSlug} />
    </Suspense>
  );
}

async function FeeRemindersContent({ schoolSlug }: { schoolSlug: string }) {
  const session = await getSession();

  if (!session || !hasSchoolAccess(session, schoolSlug)) {
    redirect("/auth/login");
  }

  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true },
  });

  if (!school) {
    redirect("/auth/login");
  }

  const getCachedSchedules = unstable_cache(
    async () => {
      return prisma.feeReminderSchedule.findMany({
        where: { schoolId: school.id },
        include: {
          installments: { orderBy: { dueDate: "asc" } },
          createdBy: { select: { name: true } },
          _count: { select: { logs: true } },
          academicYear: { select: { name: true } },
          term: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    },
    [`fee-reminders-${school.id}`],
    {
      revalidate: 3600, // Cache for 1 hour
      tags: [`fee-reminders-${school.id}`],
    }
  );

  const schedules = await getCachedSchedules();
  
  // Serialize dates to match what the client expects from the API payload previously
  const serializedSchedules = JSON.parse(JSON.stringify(schedules));

  return <FeeReminderScheduler initialSchedules={serializedSchedules} />;
}

function FeeRemindersSkeleton() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-[250px]" />
        <Skeleton className="h-4 w-[350px]" />
      </div>

      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-4 flex gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-[200px]" />
              <Skeleton className="h-3 w-[150px]" />
              <div className="flex gap-2 mt-2">
                <Skeleton className="h-4 w-[60px]" />
                <Skeleton className="h-4 w-[60px]" />
                <Skeleton className="h-4 w-[80px]" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
