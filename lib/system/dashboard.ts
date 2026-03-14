import prisma from "@/lib/prisma";

export async function getSuperAdminDashboardData() {
  const [
    userCount,
    schoolCount,
    studentCount,
    revenueData,
    recentActivity,
  ] = await Promise.all([
    // Total Users
    prisma.user.count(),
    
    // Total Schools
    prisma.organization.count(),
    
    // Total Students
    prisma.student.count(),
    
    // Total Revenue (Sum of Paid Invoices)
    prisma.invoiceRecord.aggregate({
      where: {
        status: "PAID",
      },
      _sum: {
        amount: true,
      },
    }),
    
    // Recent Activity (Top 5 Audit Logs)
    prisma.auditLog.findMany({
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  return {
    stats: {
      users: userCount,
      schools: schoolCount,
      students: studentCount,
      revenue: revenueData._sum.amount?.toNumber() || 0,
    },
    recentActivity: recentActivity.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      userName: log.user.name,
      createdAt: log.createdAt,
    })),
  };
}
