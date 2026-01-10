// app/(system)/schools/[schoolId]/overview/page.tsx
import { redirect, notFound } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { SchoolOverview } from "@/components/System/Schools/school-overview";

interface SchoolOverviewPageProps {
  params: Promise<{
    schoolId: string;
  }>;
}

export default async function SchoolOverviewPage({
  params,
}: SchoolOverviewPageProps) {
  const session = await getAuthSession();
  if (!session) {
    redirect("/sign-in");
  }

  const { schoolId } = await params;

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    include: {
      subscription: true,
      _count: {
        select: {
          students: true,
          teachers: true,
          classes: true,
          departments: true,
        },
      },
      academicYears: {
        where: { isCurrent: true },
        include: {
          terms: {
            where: { isCurrent: true },
          },
        },
        take: 1,
      },
      organization: {
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      },
    },
  });

  if (!school) {
    notFound();
  }

  // Check permissions
  const isSuperAdmin = session.user.role === "superAdmin";
  const isMember = school.organization.members.some(
    (m) => m.userId === session.user.id
  );

  if (!isSuperAdmin && !isMember) {
    redirect("/schools");
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">School Overview</h1>
        <p className="text-muted-foreground mt-2">
          View key information and statistics for {school.name}
        </p>
      </div>
      <SchoolOverview school={school} />
    </div>
  );
}
