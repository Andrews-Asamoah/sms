// app/(system)/layout.tsx - FIXED
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session"; // ✅ Use getSession
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebarSystem } from "@/components/layout/app-sidebar-system";
import { SiteHeaderSystem } from "@/components/layout/site-header-system";
import { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default async function SystemLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();

  if (!session?.isSuperAdmin) {
    redirect("/auth/login");
  }

  const userData = {
    name: session.user.name || "Super Admin",
    email: session.user.email,
    avatar: session.user.image || "/wis-logo.png",
    role: session.user.role,
  };

  return (
    <SidebarProvider>
      <AppSidebarSystem user={userData} />
      <SidebarInset className="flex flex-col h-screen">
        <SiteHeaderSystem userName={userData.name} userRole={userData.role} />
        <main className="flex-1 overflow-y-auto min-h-0">
          <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
