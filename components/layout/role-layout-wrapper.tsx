// components/layout/role-layout-wrapper.tsx
"use client";

import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebarSchool } from "@/components/layout/app-sidebar-school";
import { SiteHeaderSchool } from "@/components/layout/site-header-school";
import { ReactNode } from "react";
import type { NavPermissions } from "@/lib/auth/types";
import type { SubscriptionLifecycleStatus } from "@/lib/subscription/lifecycle";

// ============================================================================
// TYPES
// ============================================================================

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
  subscriptionStatus?: SubscriptionLifecycleStatus | null;
}

// ============================================================================
// COMPONENT
// ============================================================================

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
  // usePathname() is the correct way to read the current URL in a client
  // component — it never causes a hydration mismatch unlike window.location,
  // which is undefined on the server and causes the overlay to flash on the
  // subscription page before hydration completes.
  const pathname = usePathname();

  const isExpired = subscriptionStatus?.isExpired ?? false;
  const isExpiringSoon = subscriptionStatus?.isExpiringSoon ?? false;

  // Both "admin" and "owner" can manage billing — the original only checked
  // for "admin" which meant school owners saw no billing guidance.
  const canManageBilling = currentRole === "admin" || currentRole === "owner";

  // Don't show the expired overlay on the subscription/billing page itself —
  // the admin needs to be able to reach that page to fix the problem.
  const isOnSubscriptionPage = pathname.endsWith("/admin/subscription");

  const subscriptionUrl = `/${schoolSlug}/admin/subscription`;

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

        {/* Expiring-soon banner — shown when < 7 days remain but not yet expired */}
        {isExpiringSoon && !isExpired && (
          <div className="flex-shrink-0 bg-yellow-500 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2">
            <span className="hidden sm:inline">
              Your {subscriptionStatus?.planName} subscription expires in{" "}
              {subscriptionStatus?.daysRemaining}{" "}
              {subscriptionStatus?.daysRemaining === 1 ? "day" : "days"}.
            </span>
            <span className="sm:hidden">
              Subscription expires in {subscriptionStatus?.daysRemaining}{" "}
              {subscriptionStatus?.daysRemaining === 1 ? "day" : "days"}.
            </span>
            <a
              href={subscriptionUrl}
              className="underline hover:no-underline font-bold ml-2"
            >
              Renew now
            </a>
          </div>
        )}

        {/* Expired overlay — blocks the dashboard but lets admins reach billing */}
        {isExpired && !isOnSubscriptionPage ? (
          <div className="flex-1 relative min-h-0">
            {/* Overlay — sits above the blurred content */}
            <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-6">
              <div className="max-w-md w-full space-y-6 text-center">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
                  <svg
                    className="w-10 h-10 text-red-600 dark:text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                    />
                  </svg>
                </div>

                <div className="space-y-2">
                  <h1 className="text-2xl font-bold tracking-tight">
                    Access restricted
                  </h1>
                  <p className="text-muted-foreground">
                    The subscription for{" "}
                    <span className="font-semibold text-foreground">
                      {schoolName}
                    </span>{" "}
                    has expired. Please renew your plan to restore access.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  {canManageBilling ? (
                    <a
                      href={subscriptionUrl}
                      className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      Renew subscription
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground border rounded-lg p-4">
                      Please contact your school administrator to renew the
                      subscription.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Blurred background content — pointer-events and selection disabled */}
            <div
              className="h-full overflow-hidden blur-sm pointer-events-none select-none"
              aria-hidden="true"
            >
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
