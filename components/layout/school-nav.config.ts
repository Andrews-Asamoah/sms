// components/layout/school-nav.config.ts - WITH ROLE-BASED FILTERING
import {
  LayoutDashboard,
  Users,
  BookOpen,
  DollarSign,
  FileText,
  Settings,
  Award,
  BarChart3,
  MessageSquare,
  HelpCircle,
  Hotel,
  Package,
  BadgeDollarSign,
  GraduationCap,
  Calendar,
  Bell,
  CheckCircle2,
  Home,
  Trophy,
  AlarmClock,
} from "lucide-react";
import type { NavSection } from "@/components/layout/base-sidebar";
import type { NavPermissions } from "@/lib/auth/types";

// ============================================================================
// ADMIN / OWNER NAVIGATION
// ============================================================================
export const schoolNavSections: NavSection[] = [
  {
    title: "Main",
    items: [
      {
        title: "Dashboard",
        url: "/admin",
        icon: LayoutDashboard,
        permission: "canViewDashboard",
      },
    ],
  },
  {
    title: "User Management",
    items: [
      {
        title: "People",
        url: "#",
        icon: Users,
        items: [
          {
            title: "Students",
            url: "/admin/students",
            permission: "canManageStudents",
          },
          {
            title: "Teachers",
            url: "/admin/teachers",
            permission: "canManageTeachers",
          },
          {
            title: "Staff",
            url: "/admin/staff",
            permission: "canManageStaff",
          },
          {
            title: "Guardians",
            url: "/admin/guardians",
            permission: "canManageParents",
          },
        ],
      },
    ],
  },
  {
    title: "Academics",
    items: [
      {
        title: "Academics Hub",
        url: "/admin/academics",
        icon: LayoutDashboard,
        permission: "canViewDashboard",
      },
      {
        title: "Academic Setup",
        url: "#",
        icon: BookOpen,
        items: [
          {
            title: "Departments",
            url: "/admin/academics/departments",
            permission: "canManageTeachers",
          },
          {
            title: "Subjects",
            url: "/admin/academics/subjects",
            permission: "canManageTeachers",
          },
          {
            title: "Classes",
            url: "/admin/classes",
            permission: "canManageClasses",
          },
          {
            title: "Timetable",
            url: "/admin/timetable",
            permission: "canViewTimetable",
          },
        ],
      },
      {
        title: "Assessment setup",
        url: "#",
        icon: Award,
        items: [
          {
            title: "Examinations",
            url: "/admin/academics/examinations",
            permission: "canManageTeachers",
          },
          {
            title: "Grading Systems",
            url: "/admin/academics/grading",
            permission: "canManageGrading",
          },
          {
            title: "Assessment Templates",
            url: "/admin/academics/grading/assessment-templates",
            permission: "canManageGrading",
          },
        ],
      },
      {
        title: "Year-End Promotions",
        url: "/admin/academics/promotion",
        icon: GraduationCap,
        permission: "canManageStudents",
      },
    ],
  },
  {
    title: "Accountant Dashboard",
    items: [
      {
        title: "Dashboard",
        url: "/accountant",
        icon: LayoutDashboard,
        permission: "canViewDashboard",
      },
      {
        title: "Payroll Management",
        url: "/accountant/finance/payroll",
        icon: BadgeDollarSign,
        permission: "canViewFinance",
      },
      {
        title: "Fee Reminders",
        url: "/accountant/fee-reminders",
        icon: AlarmClock,
        permission: "canViewFinance",
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        title: "Administration",
        url: "#",
        icon: Hotel,
        items: [
          {
            title: "Academic Years",
            url: "/admin/academicYears",
            permission: "canManageAcademicYear",
          },
          {
            title: "Houses",
            url: "/admin/houses",
            permission: "canManageHouses",
          },
          {
            title: "Attendance",
            url: "/admin/attendance",
            permission: "canManageAttendance",
          },
          {
            title: "Clubs",
            url: "/admin/clubs",
            permission: "canManageClasses",
          },
        ],
      },
      {
        title: "Finance",
        url: "/admin/finance",
        icon: DollarSign,
        permission: "canViewFinance",
        items: [
          { title: "Overview", url: "/admin/finance" },
          { title: "Fee Management", url: "/admin/finance/fees" },
          { title: "Invoices", url: "/admin/finance/invoices" },
          { title: "Payments", url: "/admin/finance/payments" },
          { title: "Expenses", url: "/admin/finance/expenses" },
          { title: "Outstanding", url: "/admin/finance/outstanding" },
          { title: "Categories", url: "/admin/finance/categories" },
          { title: "Reports", url: "/admin/finance/reports" },
        ],
      },
      {
        title: "Inventory",
        url: "/admin/inventory",
        icon: Package,
        permission: "canViewFinance",
      },
    ],
  },
  {
    title: "Reporting",
    items: [
      {
        title: "Reports Hub",
        url: "/admin/reports",
        icon: BarChart3,
        permission: "canViewReports",
      },
      {
        title: "Report Cards",
        url: "#",
        icon: FileText,
        permission: "canViewReports",
        items: [
          {
            title: "Reports Overview",
            url: "/admin/reports/report-cards",
          },
          {
            title: "Manage Templates",
            url: "/admin/reports/report-cards/templates",
          },
          {
            title: "Gradebook Tracking",
            url: "/admin/reports/gradebook-tracking",
          },
        ],
      },
    ],
  },
  {
    title: "Teacher Area",
    items: [
      {
        title: "My Dashboard",
        url: "/teacher",
        icon: LayoutDashboard,
      },
      {
        title: "My Classes",
        url: "/teacher/classes",
        icon: Users,
      },
      {
        title: "Schedule",
        url: "/teacher/schedule",
        icon: Calendar,
      },
      {
        title: "Subjects",
        url: "/teacher/subjects",
        icon: BookOpen,
      },
      {
        title: "Clubs",
        url: "/teacher/clubs",
        icon: Users,
      },
      {
        title: "My Salary",
        url: "/teacher/salary",
        icon: BadgeDollarSign,
      },
      {
        title: "My House",
        url: "/teacher/house",
        icon: Home,
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        title: "Settings",
        url: "/admin/settings",
        icon: Settings,
        permission: "canManageSettings",
      },
      {
        title: "Subscription",
        url: "/admin/subscription",
        icon: BadgeDollarSign,
        permission: "canViewSupport",
      },
      {
        title: "Support",
        url: "/admin/support",
        icon: HelpCircle,
        permission: "canViewSupport",
      },
    ],
  },

  {
    title: "Student Area",
    items: [
      {
        title: "My Dashboard",
        url: "/student",
        icon: LayoutDashboard,
      },
      {
        title: "Classmates",
        url: "/student/classmates",
        icon: Users,
      },
      {
        title: "My Reports",
        url: "/student/grades",
        icon: FileText,
      },
      {
        title: "Timetable",
        url: "/student/timetable",
        icon: Calendar,
      },
      {
        title: "Attendance",
        url: "/student/attendance",
        icon: CheckCircle2,
      },
      {
        title: "My House",
        url: "/student/house",
        icon: Home,
      },
      {
        title: "My Clubs",
        url: "/student/clubs",
        icon: Trophy,
      },
    ],
  },
  {
    title: "Guardian Area",
    items: [
      {
        title: "Dashboard",
        url: "/guardian",
        icon: LayoutDashboard,
      },
      {
        title: "My Children",
        url: "/guardian/children",
        icon: Users,
      },
      {
        title: "Ward's Fees",
        url: "/guardian/fees",
        icon: DollarSign,
      },
      {
        title: "Communications",
        url: "/guardian/communications",
        icon: MessageSquare,
      },
      {
        title: "Clubs",
        url: "/guardian/clubs",
        icon: Users,
      },
    ],
  },
  {
    title: "Communication",
    items: [
      {
        title: "Announcements",
        url: "/announcements",
        icon: MessageSquare,
      },
      {
        title: "Notifications",
        url: "/notifications",
        icon: Bell,
      },
    ],
  },
];

// ============================================================================
// ROLE → SECTION MAPPING
// Only sections relevant to each role's portal are shown.
// Teacher role ONLY sees Teacher Area (not admin sections).
// ============================================================================
const ROLE_NAV_SECTIONS: Record<string, string[]> = {
  owner: [
    "Main",
    "User Management",
    "Academics",
    "Operations",
    "Reporting",
    "Communication",
    "System",
  ],
  admin: [
    "Main",
    "User Management",
    "Academics",
    "Operations",
    "Reporting",
    "Communication",
    "System",
  ],
  teacher: ["Teacher Area", "Communication"],
  accountant: [
    "User Management",
    "Operations",
    "Accountant Dashboard",
    "Communication",
  ],
  student: ["Student Area", "Communication"],
  guardian: ["Guardian Area", "Communication"],
  member: ["Teacher Area"],
};

/**
 * Filter navigation sections based on role.
 * This removes entire sections that aren't relevant to the role.
 */
export function filterNavByRole(
  sections: NavSection[],
  role: string,
): NavSection[] {
  const allowedSections = ROLE_NAV_SECTIONS[role] || ROLE_NAV_SECTIONS.member;

  return sections
    .filter(
      (section) => !section.title || allowedSections.includes(section.title),
    )
    .map((section) => {
      // Custom filtering for Accountant role
      if (role === "accountant") {
        if (section.title === "Operations") {
          return {
            ...section,
            items: section.items.map((item) => {
              if (item.title === "Administration") {
                return {
                  ...item,
                  items: item.items?.filter(
                    (subItem) => subItem.title === "Academic Years",
                  ),
                };
              }
              return item;
            }),
          };
        }

        if (section.title === "User Management") {
          return {
            ...section,
            items: section.items.map((item) => {
              if (item.title === "People") {
                return {
                  ...item,
                  items: item.items?.filter(
                    (subItem) => subItem.title !== "Teachers",
                  ),
                };
              }
              return item;
            }),
          };
        }
      }
      return section;
    });
}

/**
 * Filter navigation sections based on user permissions.
 * This is applied AFTER role filtering to remove specific items.
 */
export function filterNavByPermissions(
  sections: NavSection[],
  permissions: NavPermissions,
): NavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items
        .filter((item) => {
          const permission = item.permission as keyof NavPermissions;
          return !permission || permissions[permission];
        })
        .map((item) => ({
          ...item,
          items: item.items?.filter((subItem) => {
            const permission = subItem.permission as keyof NavPermissions;
            return !permission || permissions[permission];
          }),
        })),
    }))
    .filter((section) => section.items.length > 0);
}

/**
 * Prefix all navigation URLs with the school slug.
 * Result: /{schoolSlug}/admin, /{schoolSlug}/teacher/gradebook, etc.
 * Also handles per-role URL rewrites.
 */
export function getPrefixedNavSections(
  schoolSlug: string,
  sections: NavSection[],
  currentRole?: string,
): NavSection[] {
  const safeSlug = schoolSlug.replace(/^\/+/, "");
  // Default non-admin roles to their own prefix. For owner/admin, keep default or use admin prefix
  const rolePrefix =
    currentRole && !["owner", "admin"].includes(currentRole)
      ? currentRole
      : "admin";

  return sections.map((section) => ({
    ...section,
    items: section.items.map((item) => {
      let url = item.url;

      // Rewrite finance and inventory base path for accountant role
      if (
        currentRole === "accountant" &&
        (url.includes("/admin/finance") ||
          url.includes("/admin/inventory") ||
          url.includes("/admin/academicYears") ||
          url.includes("/admin/students") ||
          url.includes("/admin/teachers") ||
          url.includes("/admin/guardians"))
      ) {
        url = url.replace("/admin", "/accountant");
      }

      // Rewrite announcements and notifications to use the role prefix
      if (
        url.includes("/announcements") ||
        url.includes("/notifications") ||
        url.includes("/communications")
      ) {
        // If it starts with /communications or /announcements, etc.
        if (
          url.startsWith("/communications") ||
          url.startsWith("/announcements") ||
          url.startsWith("/notifications")
        ) {
          url = `/${rolePrefix}${url}`;
        } else if (url.includes("/admin/communications")) {
          url = url.replace("/admin", `/${rolePrefix}`);
        }
      }

      return {
        ...item,
        url: url === "#" ? "#" : `/${safeSlug}${url}`,
        items: item.items?.map((subItem) => {
          let subUrl = subItem.url;
          if (
            currentRole === "accountant" &&
            (subUrl.includes("/admin/finance") ||
              subUrl.includes("/admin/inventory") ||
              subUrl.includes("/admin/academicYears") ||
              subUrl.includes("/admin/students") ||
              subUrl.includes("/admin/teachers") ||
              subUrl.includes("/admin/guardians"))
          ) {
            subUrl = subUrl.replace("/admin", "/accountant");
          }
          // Rewrite announcements and notifications to use the role prefix
          if (
            subUrl.includes("/announcements") ||
            subUrl.includes("/notifications") ||
            subUrl.includes("/communications")
          ) {
            if (
              subUrl.startsWith("/communications") ||
              subUrl.startsWith("/announcements") ||
              subUrl.startsWith("/notifications")
            ) {
              subUrl = `/${rolePrefix}${subUrl}`;
            } else if (subUrl.includes("/admin/communications")) {
              subUrl = subUrl.replace("/admin", `/${rolePrefix}`);
            }
          }
          return {
            ...subItem,
            url: `/${safeSlug}${subUrl}`,
          };
        }),
      };
    }),
  }));
}
