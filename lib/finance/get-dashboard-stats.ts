import prisma from "@/lib/prisma";
import { getActiveContext } from "@/lib/academic/get-active-context";
import { ExtendedSession } from "@/lib/auth/types";
import { unstable_cache } from "next/cache";

export async function getDashboardStats(schoolSlug: string, session: ExtendedSession) {
  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: { id: true, currency: true, settings: true },
  });

  if (!school) {
    throw new Error("School not found");
  }

  // Resolve user-scoped working context
  const ctx = await getActiveContext(
    schoolSlug,
    session.user.id,
    school.settings as Record<string, string | undefined>,
    { withNames: false },
  );

  const currentAcademicYearId = ctx.academicYearId;
  const currentTermId = ctx.termId;

  // We wrap the heavy DB operations in unstable_cache.
  // The cache key includes the school ID and the specific active year/term so changing context busts cache.
  const fetchCachedStats = unstable_cache(
    async () => {
      // Fetch current year/term names for display in the dashboard
      const [currentYear, currentTerm] = await Promise.all([
        currentAcademicYearId
          ? prisma.academicYear.findUnique({
              where: { id: currentAcademicYearId },
              select: { name: true },
            })
          : null,
        currentTermId
          ? prisma.term.findUnique({
              where: { id: currentTermId },
              select: { name: true },
            })
          : null,
      ]);

      // 1. Total Revenue
      const totalRevenue = await prisma.payment.aggregate({
        where: {
          schoolId: school.id,
          status: "COMPLETED",
          ...(currentAcademicYearId && {
            bill: {
              academicYearId: currentAcademicYearId,
              ...(currentTermId && { termId: currentTermId }),
            },
          }),
        },
        _sum: {
          amount: true,
        },
      });

      // 2. Outstanding Fees
      const outstandingFees = await prisma.bill.aggregate({
        where: {
          schoolId: school.id,
          status: { not: "PAID" },
          ...(currentAcademicYearId && { academicYearId: currentAcademicYearId }),
          ...(currentTermId && { termId: currentTermId }),
        },
        _sum: {
          balanceAmount: true,
        },
      });

      // 3. Total Expenses for current period
      const totalExpenses = await prisma.expense.aggregate({
        where: {
          schoolId: school.id,
          ...(currentAcademicYearId && { academicYearId: currentAcademicYearId }),
          ...(currentTermId && { termId: currentTermId }),
        },
        _sum: {
          amount: true,
        },
      });

      // 4. Total Payroll — scoped to the active academic period
      const totalPayroll = await prisma.payrollRecord.aggregate({
        where: {
          schoolId: school.id,
          ...(currentAcademicYearId && { academicYearId: currentAcademicYearId }),
          ...(currentTermId && { termId: currentTermId }),
        },
        _sum: {
          totalGross: true,
          totalNet: true,
        },
      });

      // 5. Recent expenses in current period
      const recentExpenses = await prisma.expense.findMany({
        where: {
          schoolId: school.id,
          ...(currentAcademicYearId && { academicYearId: currentAcademicYearId }),
          ...(currentTermId && { termId: currentTermId }),
        },
        orderBy: { date: "desc" },
        take: 5,
        include: {
          recordedBy: { select: { name: true } },
        },
      });

      // 6. Inventory Data (Total and Low Stock)
      const inventoryItems = await prisma.inventoryItem.findMany({
        where: { schoolId: school.id },
        select: { id: true, quantity: true, minQuantity: true },
      });

      return {
        currentYearName: currentYear?.name ?? null,
        currentTermName: currentTerm?.name ?? null,
        revenue: totalRevenue._sum.amount ? Number(totalRevenue._sum.amount) : 0,
        outstanding: outstandingFees._sum.balanceAmount ? Number(outstandingFees._sum.balanceAmount) : 0,
        expenses: totalExpenses._sum.amount ? Number(totalExpenses._sum.amount) : 0,
        payroll: {
          gross: totalPayroll._sum.totalGross ? Number(totalPayroll._sum.totalGross) : 0,
          net: totalPayroll._sum.totalNet ? Number(totalPayroll._sum.totalNet) : 0,
        },
        recentTransactions: recentExpenses,
        inventoryCount: inventoryItems.length,
        lowStockCount: inventoryItems.filter(i => i.quantity <= i.minQuantity).length,
      };
    },
    [
      `dashboard-stats-${school.id}-${currentAcademicYearId || "all"}-${currentTermId || "all"}`,
    ],
    {
      revalidate: 300, // Cache for 5 minutes
      tags: [
        `dashboard-${school.id}`,
        `expenses-${school.id}`,
        `payments-${school.id}`,
        `payroll-${school.id}`,
        `inventory-${school.id}`,
      ],
    },
  );

  const stats = await fetchCachedStats();

  return {
    ...stats,
    currency: school.currency,
  };
}
