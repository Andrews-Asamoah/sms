// ============================================
// ALTERNATIVE: SERVER-ONLY VERSION WITH PARAMS
// app/(school)/[schoolSlug]/layout.tsx
// ============================================
import { AppSidebarSchool } from '@/components/layout/schoolSidebar';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';

export default function SchoolLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { schoolSlug: string };
}) {
  const schoolSlug = params.schoolSlug;

  // Manually define breadcrumbs in server component
  const breadcrumbs = [
    { label: 'School', href: `/${schoolSlug}` },
    { label: 'Dashboard', isCurrentPage: true },
  ];

  const headerActions = (
    <Badge variant="outline" className="gap-1.5">
      <Calendar className="h-3.5 w-3.5" />
      <span className="text-xs">2024/2025</span>
    </Badge>
  );

  return (
    <DashboardLayout
      sidebar={<AppSidebarSchool />}
      breadcrumbs={breadcrumbs}
      headerActions={headerActions}
    >
      {children}
    </DashboardLayout>
  );
}
