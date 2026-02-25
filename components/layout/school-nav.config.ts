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
        url: "/admin/dashboard",
        icon: LayoutDashboard,
        permission: "canViewDashboard",
      },
      {
        title: "Analytics",
        url: "/admin/analytics",
        icon: BarChart3,
        permission: "canViewAnalytics",
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
            title: "Parents",
            url: "/admin/parents",
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
            title: "Examinations",
            url: "/admin/academics/examinations",
            permission: "canManageTeachers",
          },
          {
            title: "Timetable",
            url: "/admin/timetable",
            permission: "canViewTimetable",
          },
        ],
      },
      {
        title: "Assessment",
        url: "#",
        icon: Award,
        items: [
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
          {
            title: "Report Cards",
            url: "/admin/reports",
            permission: "canViewReports",
          },
        ],
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
          { title: "Payments", url: "/admin/finance/payments" },
          { title: "Outstanding", url: "/admin/finance/outstanding" },
          { title: "Reports", url: "/admin/finance/reports" },
        ],
      },
    ],
  },
  {
    title: "Teacher Area",
    items: [
      {
        title: "My Gradebooks",
        url: "/teacher/gradebook",
        icon: GraduationCap,
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
    ],
  },
  {
    title: "Communication",
    items: [
      {
        title: "Announcements",
        url: "/admin/communications",
        icon: MessageSquare,
        permission: "canManageAnnouncements",
      },
      {
        title: "Documents",
        url: "/admin/documents",
        icon: FileText,
        permission: "canManageDocuments",
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
        items: [
          { title: "General", url: "/admin/settings" },
          { title: "Users & Roles", url: "/admin/users" },
        ],
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
    "Communication",
    "System",
  ],
  admin: [
    "Main",
    "User Management",
    "Academics",
    "Operations",
    "Communication",
    "System",
  ],
  teacher: ["Teacher Area", "Communication"],
  accountant: ["Operations"],
  staff: ["Communication"],
  student: [],
  guardian: [],
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

  return sections.filter(
    (section) => !section.title || allowedSections.includes(section.title),
  );
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
 * Result: /{schoolSlug}/admin/dashboard, /{schoolSlug}/teacher/gradebook, etc.
 * Also handles per-role URL rewrites (e.g., accountant gets /accountant/finance).
 */
export function getPrefixedNavSections(
  schoolSlug: string,
  sections: NavSection[],
  currentRole?: string,
): NavSection[] {
  const safeSlug = schoolSlug.replace(/^\/+/, "");

  return sections.map((section) => ({
    ...section,
    items: section.items.map((item) => {
      let url = item.url;

      // Rewrite finance base path for accountant role
      if (currentRole === "accountant" && url.includes("/admin/finance")) {
        url = url.replace("/admin/finance", "/accountant/finance");
      }

      return {
        ...item,
        url: url === "#" ? "#" : `/${safeSlug}${url}`,
        items: item.items?.map((subItem) => {
          let subUrl = subItem.url;
          if (
            currentRole === "accountant" &&
            subUrl.includes("/admin/finance")
          ) {
            subUrl = subUrl.replace("/admin/finance", "/accountant/finance");
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
