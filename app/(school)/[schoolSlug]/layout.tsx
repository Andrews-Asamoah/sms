// app/(school)/[schoolSlug]/layout.tsx
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ReactNode } from "react";
import { AppSidebarSchool } from "@/components/layout/app-sidebar-school";
import { SiteHeaderSchool } from "@/components/layout/site-header-school";

export default async function SchoolLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { schoolSlug: string };
}) {
  const session = await getAuthSession();
  const { schoolSlug } = params;

  if (!session) {
    redirect("/login");
  }

  // TODO: Fetch school data from database based on schoolSlug
  // This should be replaced with actual database query
  const schoolData = {
    name: "St. Mary's High School",
    plan: "Premium Plan",
    logo: "/schools/st-marys.png",
    academicYear: "2024/2025",
  };

  const userData = {
    name: session.user.name || "User",
    email: session.user.email,
    avatar: session.user.image ?? undefined,
  };

  return (
    <SidebarProvider>
      <AppSidebarSchool
        schoolSlug={schoolSlug}
        schoolName={schoolData.name}
        schoolPlan={schoolData.plan}
        schoolLogo={schoolData.logo}
        user={userData}
      />
      <SidebarInset className="flex flex-col h-screen">
        <SiteHeaderSchool
          schoolSlug={schoolSlug}
          academicYear={schoolData.academicYear}
        />
        <main className="flex-1 overflow-y-auto min-h-0">
          <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
