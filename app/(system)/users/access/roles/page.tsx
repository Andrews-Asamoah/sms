import { requireSuperAdmin } from "@/lib/auth/session";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Users,
  GraduationCap,
  DollarSign,
  BookOpen,
  AlertTriangle,
  Eye,
} from "lucide-react";

export const metadata = {
  title: "Roles & Permissions | SuperAdmin Dashboard",
  description: "View and manage role-based access control definitions",
};

const roles = [
  {
    name: "superAdmin",
    label: "Super Administrator",
    description:
      "Full platform access, school creation, and global management.",
    badgeVariant: "default" as const,
    icon: <Shield className="h-5 w-5 text-primary" />,
    permissions: [
      "Manage all schools",
      "Create & archive schools",
      "Manage system users",
      "View global analytics",
      "Billing & subscriptions",
    ],
  },
  {
    name: "owner",
    label: "School Owner",
    description: "Full access to their school, including financial management.",
    badgeVariant: "secondary" as const,
    icon: <Shield className="h-5 w-5 text-yellow-500" />,
    permissions: [
      "Manage school settings",
      "Invite admins & staff",
      "Full financial access",
      "View all reports",
      "Manage subscriptions",
    ],
  },
  {
    name: "admin",
    label: "Administrator",
    description: "Day-to-day school operations management.",
    badgeVariant: "outline" as const,
    icon: <Users className="h-5 w-5 text-blue-500" />,
    permissions: [
      "Manage students & teachers",
      "View financial data",
      "Manage classes & departments",
      "Send announcements",
      "Generate reports",
    ],
  },
  {
    name: "headteacher",
    label: "Head Teacher",
    description: "Full academic and administrative management.",
    badgeVariant: "outline" as const,
    icon: <GraduationCap className="h-5 w-5 text-purple-500" />,
    permissions: [
      "All teacher permissions",
      "Approve assessments",
      "Manage timetables",
      "View financial summaries",
      "Department management",
    ],
  },
  {
    name: "teacher",
    label: "Teacher",
    description: "Classroom management and student assessment.",
    badgeVariant: "outline" as const,
    icon: <BookOpen className="h-5 w-5 text-green-500" />,
    permissions: [
      "View assigned classes",
      "Create assessments",
      "Record attendance",
      "View student profiles",
      "Upload documents",
    ],
  },
  {
    name: "accountant",
    label: "Accountant",
    description: "Financial management and reporting.",
    badgeVariant: "outline" as const,
    icon: <DollarSign className="h-5 w-5 text-emerald-500" />,
    permissions: [
      "Manage fee structures",
      "Record payments",
      "Generate financial reports",
      "View student financials",
      "Manage expenses",
    ],
  },
  {
    name: "student",
    label: "Student",
    description: "View own academic information.",
    badgeVariant: "outline" as const,
    icon: <Eye className="h-5 w-5 text-gray-500" />,
    permissions: [
      "View own grades",
      "View timetable",
      "View announcements",
      "View own attendance",
      "Pay fees online",
    ],
  },
  {
    name: "guardian",
    label: "Parent / Guardian",
    description: "View children's information and make payments.",
    badgeVariant: "outline" as const,
    icon: <Users className="h-5 w-5 text-orange-500" />,
    permissions: [
      "View ward's academic data",
      "Receive announcements",
      "Make fee payments",
      "Communicate with teachers",
      "View report cards",
    ],
  },
];

export default async function RolesPermissionsPage() {
  await requireSuperAdmin();

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Roles & Permissions
        </h1>
        <p className="text-muted-foreground mt-2">
          Overview of all system roles and their associated permissions. Role
          definitions are managed in code.
        </p>
      </div>

      <Card className="border-yellow-500/30 bg-yellow-50/50 dark:bg-yellow-900/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Roles are defined in code</p>
              <p className="text-sm text-muted-foreground mt-1">
                Role capabilities are statically defined in{" "}
                <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
                  lib/auth/permissions.ts
                </code>
                . To modify role permissions, update this file and redeploy.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {roles.map((role) => (
          <Card key={role.name} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {role.icon}
                  <div>
                    <CardTitle className="text-base">{role.label}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {role.description}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={role.badgeVariant} className="shrink-0 text-xs">
                  {role.name}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {role.permissions.map((perm) => (
                  <li
                    key={perm}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    {perm}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
