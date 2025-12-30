// ============================================
// BASE DASHBOARD LAYOUT (REUSABLE)
// components/layout/dashboard-layout.tsx
// ============================================
import * as React from 'react';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';

interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrentPage?: boolean;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  breadcrumbs: BreadcrumbItem[];
  headerActions?: React.ReactNode;
}

export function DashboardLayout({
  children,
  sidebar,
  breadcrumbs,
  headerActions,
}: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      {sidebar}
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((item, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && (
                      <BreadcrumbSeparator className="hidden md:block" />
                    )}
                    <BreadcrumbItem className={index === 0 ? 'hidden md:block' : ''}>
                      {item.isCurrentPage ? (
                        <BreadcrumbPage>{item.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={item.href || '#'}>
                          {item.label}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto flex items-center gap-2 px-4">
            {headerActions && (
              <>
                {headerActions}
                <Separator orientation="vertical" className="h-4" />
              </>
            )}
            <ThemeToggle />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}