// app/(system)/layout.tsx
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ReactNode } from "react";
import { AppSidebarSystem } from "@/components/layout/app-sidebar-system";
import { SiteHeaderSystem } from "@/components/layout/site-header-system";

export default async function SystemLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getAuthSession();

  if (!session || session.user.role !== "superAdmin") {
    redirect("/login");
  }

  const userData = {
    name: session.user.name || "Super Admin",
    email: session.user.email,
    avatar: session.user.image || "/wis-logo.png",
  };

  return (
    <SidebarProvider>
      <AppSidebarSystem user={userData} />
      <SidebarInset className="flex flex-col h-screen">
        <SiteHeaderSystem />
        <main className="flex-1 overflow-y-auto min-h-0">
          <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
