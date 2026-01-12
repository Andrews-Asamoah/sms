// app/callback/page.tsx
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Loader2 } from "lucide-react";

export default async function CallbackPage() {
  const session = await getAuthSession();

  // No session - redirect to login
  if (!session) {
    redirect("/login");
  }

  // 1. Super Admin - Platform level access
  if (session.user.role === "superAdmin") {
    redirect("/system/dashboard");
  }

  // 2. Check for organization memberships (School Admins/Owners/Members)
  const memberships = await prisma.member.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      organization: {
        include: {
          school: {
            select: {
              subdomain: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc", // Most recent membership first
    },
  });

  if (memberships.length > 0) {
    const firstSchool = memberships[0].organization.school;
    if (firstSchool) {
      // Redirect to school admin dashboard
      redirect(`/${firstSchool.subdomain}/admin/dashboard`);
    }
  }

  // 3. Check for school-specific profiles (Teachers, Students, Staff, Guardians)
  if (session.profile) {
    // Check Teacher
    if (session.profile.teacher) {
      const school = session.profile.teacher.school;
      if (school && session.profile.teacher.isActive) {
        redirect(`/${school.subdomain}/teacher/dashboard`);
      }
    }

    // Check Student
    if (session.profile.student) {
      const school = session.profile.student.school;
      if (school && session.profile.student.status === "ACTIVE") {
        redirect(`/${school.subdomain}/student/dashboard`);
      }
    }

    // Check Staff
    if (session.profile.staff) {
      const school = session.profile.staff.school;
      if (school && session.profile.staff.isActive) {
        // Route accountants to finance dashboard
        if (session.profile.staff.staffType === "ACCOUNTANT") {
          redirect(`/${school.subdomain}/accountant/dashboard`);
        }

        // Other staff types
        redirect(`/${school.subdomain}/staff/dashboard`);
      }
    }

    // Check Guardian
    if (session.profile.guardian) {
      const school = session.profile.guardian.school;
      if (
        school &&
        session.profile.guardian.isActive &&
        session.profile.guardian.canLogin
      ) {
        redirect(`/${school.subdomain}/parent/dashboard`);
      }
    }
  }

  // 4. No access found - show onboarding/error page
  redirect("/onboarding");
}

// This is just a loading fallback (won't be shown due to server redirect)
export function Loading() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="text-center">
        <Loader2 className="h-16 w-16 text-blue-600 dark:text-blue-400 animate-spin mx-auto" />
        <p className="mt-4 text-slate-600 dark:text-slate-400">
          Redirecting to your dashboard...
        </p>
      </div>
    </div>
  );
}
