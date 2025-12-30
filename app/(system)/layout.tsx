// ============================================
// ALTERNATIVE: SERVER-ONLY VERSION FOR SYSTEM
// app/(system)/layout.tsx
// ============================================
import { AppSidebarSystem } from '@/components/layout/systemSidebar';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

export default function SystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const breadcrumbs = [
    { label: 'System', href: '/dashboard' },
    { label: 'Dashboard', isCurrentPage: true },
  ];

  return (
    <DashboardLayout
      sidebar={<AppSidebarSystem />}
      breadcrumbs={breadcrumbs}
    >
      {children}
    </DashboardLayout>
  );
}