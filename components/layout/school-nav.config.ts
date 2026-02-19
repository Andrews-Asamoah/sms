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
} from "lucide-react";
import type { NavSection } from "@/components/layout/base-sidebar";
import type { NavPermissions } from "@/lib/auth/types";

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
            title: "Grade Entry",
            url: "/admin/grading/entry",
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
        icon: Hotel, // Using Hotel as a generic building/admin icon
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
        title: "Facilities",
        url: "#",
        icon: Package,
        items: [
          {
            title: "Hostel",
            url: "/admin/hostel",
            permission: "canViewHostel",
          },
          {
            title: "Transport",
            url: "/admin/transport",
            permission: "canViewTransport",
          },
          {
            title: "Library",
            url: "/admin/library",
            permission: "canViewLibrary",
          },
          {
            title: "Inventory",
            url: "/admin/inventory",
            permission: "canViewInventory",
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
          { title: "Invoices", url: "/admin/finance/invoices" }, // Will need placeholder or implement
          { title: "Outstanding", url: "/admin/finance/outstanding" },
          { title: "Reports", url: "/admin/finance/reports" }, // Placeholder
        ],
      },
    ],
  },
  {
    title: "Communication",
    items: [
      {
        title: "Announcements",
        url: "/admin/announcements",
        icon: MessageSquare,
        permission: "canManageAnnouncements",
      },
      {
        title: "Messages",
        url: "/admin/communications",
        icon: MessageSquare,
        permission: "canViewCommunications",
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
          { title: "Preferences", url: "/admin/settings/preferences" },
        ],
      },
      {
        title: "Subscription",
        url: "/admin/subscription",
        icon: BadgeDollarSign,
        permission: "canViewSupport", // Ideally this should be a stronger permission like 'manageSubscription' but 'canViewSupport' (admin only usually) works for now, or just rely on role filter.
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

/**
 * Role-specific navigation sections
 * These define which sections each role should see
 */
const ROLE_NAV_SECTIONS: Record<string, string[]> = {
  owner: [
    "Main",
    "Academics",
    "Assessment",
    "Operations",
    "Communication",
    "User Management",
    "Personal",
    "System",
  ],
  admin: [
    "Main",
    "Academics",
    "User Management",
    "Assessment",
    "Operations",
    "Communication",
    "Personal",
    "System",
  ],
  teacher: ["Main", "Assessment", "Operations", "Communication", "Personal"],
  accountant: ["Main", "Operations", "Personal"],
  staff: ["Main", "Operations", "Communication", "Personal"],
  student: ["Main", "Assessment", "Operations", "Communication", "Personal"],
  guardian: ["Main", "Operations", "Communication", "Personal"],
  member: ["Main", "Personal"],
};

/**
 * Filter navigation sections based on role
 * This removes entire sections that aren't relevant to the role
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
 * Filter navigation sections based on user permissions
 * This is applied AFTER role filtering to remove specific items
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
          items: item.items?.filter(() => {
            const permission = item.permission as keyof NavPermissions;
            return !permission || permissions[permission];
          }),
        })),
    }))
    .filter((section) => section.items.length > 0);
}

/**
 * Prefix all navigation URLs with a school slug
 * This ensures routes are: /{schoolSlug}/admin/dashboard, etc.
 * Also handles role-specific URL rewrites (e.g. Finance)
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

      // Dynamic URL rewriting for Finance
      if (
        currentRole === "accountant" &&
        (url.includes("/admin/finance") || url.includes("/accountant/finance"))
      ) {
        // Force accountant path if role is accountant
        url = url.replace("/admin/finance", "/accountant/finance");
      } else if (currentRole !== "accountant" && item.title === "Finance") {
        // Force admin path for non-accountants (admins/owners)
        // This assumes the base config might be set to either, setting to admin ensures consistency
        url = url.replace("/accountant/finance", "/admin/finance");
      }

      return {
        ...item,
        url: `/${safeSlug}${url}`,
        items: item.items?.map((subItem) => {
          let subUrl = subItem.url;
          if (
            currentRole === "accountant" &&
            (subUrl.includes("/admin/finance") ||
              subUrl.includes("/accountant/finance"))
          ) {
            subUrl = subUrl.replace("/admin/finance", "/accountant/finance");
          } else if (
            currentRole !== "accountant" &&
            (subUrl.includes("/admin/finance") ||
              subUrl.includes("/accountant/finance"))
          ) {
            subUrl = subUrl.replace("/accountant/finance", "/admin/finance");
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
