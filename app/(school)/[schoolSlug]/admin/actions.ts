"use server";

import prisma from "@/lib/prisma";
import { startOfMonth, subMonths, endOfMonth } from "date-fns";
import { formatStudentName } from "@/lib/utils/name-formatter";
import { getActiveContext } from "@/lib/academic/get-active-context";
import { getSession } from "@/lib/auth/session";

export async function getAdminDashboardStats(schoolSlug: string) {
  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: {
      id: true,
      name: true,
      currency: true,
      settings: true,
    },
  });

  if (!school) throw new Error("School not found");

  // Resolve the active academic context via the shared utility.
  // Honors the admin's personal session cookie override (user-scoped) before
  // falling back to the global school.settings values.
  const session = await getSession();
  const userId = session?.user.id ?? "anonymous";
  const ctx = await getActiveContext(schoolSlug, userId, school.settings as Record<string, string | undefined>);
  const { academicYearId: currentAcademicYearId, termId: currentTermId } = ctx;

  // Counts ──────────────────────────────────────────────────────────────────
  const [activeStudentCount, activeTeacherCount, activeStaffCount, activeClassCount] =
    await Promise.all([
      prisma.student.count({
        where: {
          schoolId: school.id,
          status: "ACTIVE",
          enrollments: {
            some: {
              academicYearId: currentAcademicYearId || undefined,
              termId: currentTermId || undefined,
              status: "ACTIVE",
            },
          },
        },
      }),
      prisma.teacher.count({
        where: { schoolId: school.id, isActive: true, profileId: { not: null } },
      }),
      prisma.staff.count({
        where: { schoolId: school.id, isActive: true },
      }),
      prisma.class.count({
        where: { schoolId: school.id, isActive: true },
      }),
    ]);

  // Financial totals ────────────────────────────────────────────────────────
  const [bills, expenses] = await Promise.all([
    prisma.bill.findMany({
      where: {
        schoolId: school.id,
        academicYearId: currentAcademicYearId || undefined,
        termId: currentTermId || undefined,
      },
      select: { paidAmount: true },
    }),
    prisma.expense.findMany({
      where: {
        schoolId: school.id,
        academicYearId: currentAcademicYearId || undefined,
        termId: currentTermId || undefined,
      },
      select: { amount: true },
    }),
  ]);

  const totalRevenue = bills.reduce((sum, b) => sum + Number(b.paidAmount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  // Enrollment trend (last 6 calendar months) ───────────────────────────────
  const enrollmentTrends = await Promise.all(
    Array.from({ length: 6 }).map(async (_, i) => {
      const monthDate = subMonths(new Date(), 5 - i);
      const count = await prisma.student.count({
        where: {
          schoolId: school.id,
          admissionDate: { gte: startOfMonth(monthDate), lte: endOfMonth(monthDate) },
        },
      });
      return { month: monthDate.toLocaleString("default", { month: "short" }), students: count };
    }),
  );

  // Gender distribution ─────────────────────────────────────────────────────
  const genderDistribution = await Promise.all([
    prisma.student.count({
      where: {
        schoolId: school.id,
        status: "ACTIVE",
        profile: { gender: "MALE" },
        enrollments: {
          some: { academicYearId: currentAcademicYearId || undefined, status: "ACTIVE" },
        },
      },
    }),
    prisma.student.count({
      where: {
        schoolId: school.id,
        status: "ACTIVE",
        profile: { gender: "FEMALE" },
        enrollments: {
          some: { academicYearId: currentAcademicYearId || undefined, status: "ACTIVE" },
        },
      },
    }),
  ]).then(([male, female]) => [
    { gender: "male", count: male, fill: "var(--color-male)" },
    { gender: "female", count: female, fill: "var(--color-female)" },
  ]);

  // Recent activity ─────────────────────────────────────────────────────────
  const recentStudents = await prisma.student.findMany({
    where: { schoolId: school.id },
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { profile: true, class: true },
  });

  const result = {
    schoolName: school.name,
    currency: school.currency,
    // Context names for dashboard header display
    academicYearName: ctx.academicYearName,
    termName: ctx.termName,
    counts: {
      students: activeStudentCount,
      teachers: activeTeacherCount,
      staff: activeStaffCount,
      classes: activeClassCount,
    },
    financials: {
      totalRevenue,
      totalExpenses,
      chartData: [
        { name: "Revenue", value: totalRevenue, fill: "var(--color-revenue)" },
        { name: "Expenses", value: totalExpenses, fill: "var(--color-expenses)" },
      ],
    },
    enrollmentTrends,
    genderDistribution,
    recentActivities: recentStudents.map((s) => ({
      id: s.id,
      title: "New Student Enrolled",
      description: `${s.profile ? formatStudentName(s.profile.firstName, s.profile.lastName, s.profile.otherNames) : 'Unknown Student'} joined ${s.class?.name || "N/A"}`,
      time: s.createdAt.toISOString(),
    })),
  };

  return JSON.parse(JSON.stringify(result));
}
