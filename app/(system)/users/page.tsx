// app/(system)/users/page.tsx
import { requireSuperAdmin } from "@/lib/auth/session";
import { UserManagementClient } from "@/components/System/Users/user-management-client";
import prisma from "@/lib/prisma";

export const metadata = {
  title: "System Users | SuperAdmin Dashboard",
  description: "Manage all users across the system",
};

export default async function SystemUsersPage() {
  await requireSuperAdmin();

  // Fetch superAdmins and org admins/owners
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { role: "superAdmin" },
        {
          members: {
            some: {
              role: {
                in: ["admin", "owner"],
              },
            },
          },
        },
      ],
    },
    include: {
      userProfile: true,
      members: {
        include: {
          organization: {
            include: {
              school: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Users</h1>
        <p className="text-muted-foreground mt-2">
          Manage all users across the system including their roles and school
          assignments.
        </p>
      </div>

      <UserManagementClient initialUsers={users} />
    </div>
  );
}
