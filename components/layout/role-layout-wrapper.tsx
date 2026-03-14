// components/layout/role-layout-wrapper.tsx
"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebarSchool } from "@/components/layout/app-sidebar-school";
import { SiteHeaderSchool } from "@/components/layout/site-header-school";
import { ReactNode } from "react";
import type { NavPermissions } from "@/lib/auth/types";

interface RoleLayoutWrapperProps {
  children: ReactNode;
  schoolSlug: string;
  schoolName: string;
  schoolPlan: string;
  schoolLogo?: string;
  user: {
    name: string;
    email: string;
    avatar?: string;
    role: string;
  };
  academicYear: string;
  currentTerm: string | null;
  currentRole: string;
  availableRoles: string[];
  permissions: NavPermissions;
  subscriptionStatus?: import("@/lib/subscription/lifecycle").SubscriptionLifecycleStatus | null;
}

export function RoleLayoutWrapper({
  children,
  schoolSlug,
  schoolName,
  schoolPlan,
  schoolLogo,
  user,
  academicYear,
  currentTerm,
  currentRole,
  availableRoles,
  permissions,
  subscriptionStatus,
}: RoleLayoutWrapperProps) {
  const isExpired = subscriptionStatus?.isExpired;
  const isExpiringSoon = subscriptionStatus?.isExpiringSoon;
  const isAdmin = currentRole === "admin";
  
  // Don't show the restrictive overlay if we are on the subscription/billing page
  const isSubscriptionPage = typeof window !== "undefined" && window.location.pathname.endsWith("/subscription");

  return (
    <SidebarProvider>
      <div className="print:hidden">
        <AppSidebarSchool
          schoolSlug={schoolSlug}
          schoolName={schoolName}
          schoolPlan={schoolPlan}
          schoolLogo={schoolLogo}
          user={user}
          permissions={permissions}
          currentActiveRole={currentRole}
        />
      </div>
      <SidebarInset className="flex flex-col h-screen overflow-hidden print:h-auto print:block">
        <div className="print:hidden flex-shrink-0">
          <SiteHeaderSchool
            schoolSlug={schoolSlug}
            academicYear={academicYear}
            currentTerm={currentTerm}
            currentRole={currentRole}
            availableRoles={availableRoles}
          />
        </div>
        
        {isExpiringSoon && !isExpired && (
          <div className="bg-yellow-500 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
            <span className="hidden sm:inline">⚠️ Your {subscriptionStatus?.planName} subscription is expiring in {subscriptionStatus?.daysRemaining} days.</span>
            <span className="sm:hidden">⚠️ Subscription expiring in {subscriptionStatus?.daysRemaining} days.</span>
            <a 
              href={`/schools/${schoolSlug}/subscription`} 
              className="underline hover:no-underline font-bold ml-2"
            >
              Renew Now
            </a>
          </div>
        )}

        {isExpired && !isSubscriptionPage ? (
          <div className="flex-1 relative">
            {/* Restricted Access Overlay */}
            <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-6 text-center">
              <div className="max-w-md space-y-6">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-4xl">🔒</span>
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tight">Access Restricted</h1>
                  <p className="text-muted-foreground">
                    The subscription for <span className="font-semibold text-foreground">{schoolName}</span> has expired. 
                    Please renew your plan to regain access to the dashboard.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <a 
                    href={`/schools/${schoolSlug}/subscription`}
                    className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                  >
                    Renew Subscription
                  </a>
                  {isAdmin && (
                    <p className="text-xs text-muted-foreground pt-4 border-t">
                      Administrators can still access the billing page to manage their subscription.
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Blurred content */}
            <div className="filter blur-[2px] pointer-events-none select-none h-full overflow-hidden">
               {children}
            </div>
          </div>
        ) : (
          <main className="flex-1 overflow-y-auto min-h-0 print:overflow-visible print:h-auto print:block [scrollbar-gutter:stable]">
            <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6 print:p-0 print:max-w-none">
              {children}
            </div>
          </main>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
