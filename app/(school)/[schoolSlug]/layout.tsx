// app/(school)/[schoolSlug]/layout.tsx
import { redirect, notFound } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ReactNode } from "react";
import { AppSidebarSchool } from "@/components/layout/app-sidebar-school";
import { SiteHeaderSchool } from "@/components/layout/site-header-school";

interface SchoolLayoutProps {
  children: ReactNode;
  params: Promise<{ schoolSlug: string }>;
}

export default async function SchoolLayout({
  children,
  params,
}: SchoolLayoutProps) {
  const session = await getAuthSession();

  if (!session) {
    redirect("/login");
  }

  const { schoolSlug } = await params;

  // Fetch school data from database
  const school = await prisma.school.findUnique({
    where: { subdomain: schoolSlug },
    select: {
      id: true,
      name: true,
      code: true,
      subdomain: true,
      logo: true,
      primaryColor: true,
      secondaryColor: true,
      subscription: {
        select: {
          planName: true,
          planType: true,
          status: true,
        },
      },
      academicYears: {
        where: { isCurrent: true },
        select: {
          name: true,
          startDate: true,
          endDate: true,
          terms: {
            where: { isCurrent: true },
            select: {
              name: true,
            },
            take: 1,
          },
        },
        take: 1,
      },
      organization: {
        select: {
          id: true,
          members: {
            where: {
              userId: session.user.id,
            },
            select: {
              role: true,
            },
            take: 1,
          },
        },
      },
    },
  });

  // If school not found, show 404
  if (!school) {
    notFound();
  }

  // Check multiple ways a user can have access to this school
  const isSuperAdmin = session.user.role === "superAdmin";
  const organizationMembership = school.organization.members[0];

  // Check if user has a role-specific profile in this school
  let schoolRoleProfile: {
    type: "student" | "teacher" | "staff" | "guardian" | null;
    isActive: boolean;
  } | null = null;

  if (session.profile) {
    // Check if student
    if (
      session.profile.student &&
      session.profile.student.schoolId === school.id
    ) {
      schoolRoleProfile = {
        type: "student",
        isActive: session.profile.student.status === "ACTIVE",
      };
    }
    // Check if teacher
    else if (
      session.profile.teacher &&
      session.profile.teacher.schoolId === school.id
    ) {
      schoolRoleProfile = {
        type: "teacher",
        isActive: session.profile.teacher.isActive,
      };
    }
    // Check if staff
    else if (
      session.profile.staff &&
      session.profile.staff.schoolId === school.id
    ) {
      schoolRoleProfile = {
        type: "staff",
        isActive: session.profile.staff.isActive,
      };
    }
    // Check if guardian
    else if (
      session.profile.guardian &&
      session.profile.guardian.schoolId === school.id
    ) {
      schoolRoleProfile = {
        type: "guardian",
        isActive: session.profile.guardian.isActive,
      };
    }
  }

  // Determine if user has access to this school
  const hasAccess =
    isSuperAdmin ||
    organizationMembership ||
    (schoolRoleProfile && schoolRoleProfile.isActive);

  if (!hasAccess) {
    redirect(`/${schoolSlug}/unauthorized`);
  }

  // Get user's display role for UI
  let displayRole: string;

  if (isSuperAdmin) {
    displayRole = "Super Admin";
  } else if (organizationMembership) {
    // Organization member roles (OWNER, ADMIN, MEMBER)
    switch (organizationMembership.role) {
      case "OWNER":
        displayRole = "Owner";
        break;
      case "ADMIN":
        displayRole = "Administrator";
        break;
      case "MEMBER":
        displayRole = "Member";
        break;
      default:
        displayRole = "Member";
    }
  } else if (schoolRoleProfile) {
    // School-specific role profiles
    switch (schoolRoleProfile.type) {
      case "student":
        displayRole = "Student";
        break;
      case "teacher":
        displayRole = "Teacher";
        break;
      case "staff":
        displayRole = "Staff";
        break;
      case "guardian":
        displayRole = "Parent/Guardian";
        break;
      default:
        displayRole = "User";
    }
  } else {
    displayRole = "User";
  }

  // Prepare school data
  const schoolData = {
    id: school.id,
    name: school.name,
    code: school.code,
    subdomain: school.subdomain,
    logo: school.logo || undefined,
    primaryColor: school.primaryColor,
    secondaryColor: school.secondaryColor,
    plan: school.subscription?.planName || "Free Plan",
    planType: school.subscription?.planType || "FREE",
    subscriptionStatus: school.subscription?.status || "ACTIVE",
    academicYear: school.academicYears[0]?.name || "No Active Academic Year",
    currentTerm: school.academicYears[0]?.terms[0]?.name || null,
  };

  // Prepare user data
  const userData = {
    name: session.user.name || "User",
    email: session.user.email,
    avatar: session.user.image ?? undefined,
    role: displayRole,
  };

  return (
    <SidebarProvider>
      <AppSidebarSchool
        schoolSlug={schoolData.subdomain}
        schoolName={schoolData.name}
        schoolPlan={schoolData.plan}
        schoolLogo={schoolData.logo}
        user={userData}
      />
      <SidebarInset className="flex flex-col h-screen">
        <SiteHeaderSchool
          schoolSlug={schoolData.subdomain}
          academicYear={schoolData.academicYear}
          currentTerm={schoolData.currentTerm}
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
