// components/layout/school-nav.config.ts - WITH ROLE-BASED FILTERING
import {
  LayoutDashboard,
  Users,
  Calendar,
  BookOpen,
  ClipboardCheck,
  DollarSign,
  FileText,
  Settings,
  Home,
  UserCog,
  BookMarked,
  Building,
  Award,
  BarChart3,
  MessageSquare,
  HelpCircle,
  Hotel,
  Library,
  Package,
  Bus,
  UserCircle,
  CalendarDays,
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
    title: "Academic",
    items: [
      {
        title: "Students",
        url: "/admin/students",
        icon: Users,
        permission: "canManageStudents",
        items: [
          { title: "All Students", url: "/admin/students" },
          { title: "Enrollments", url: "/admin/students/enrollments" },
          { title: "Promotions", url: "/admin/students/promotions" },
        ],
      },
      {
        title: "Teachers",
        url: "/admin/teachers",
        icon: UserCog,
        permission: "canManageTeachers",
        items: [
          { title: "All Teachers", url: "/admin/teachers" },
          { title: "Assignments", url: "/admin/teachers/assignments" },
          { title: "Schedule", url: "/admin/teachers/schedule" },
        ],
      },
      {
        title: "Staff",
        url: "/admin/staff",
        icon: UserCircle,
        permission: "canManageStaff",
      },
      {
        title: "Parents",
        url: "/admin/parents",
        icon: Users,
        permission: "canManageParents",
      },
      {
        title: "Classes",
        url: "/admin/classes",
        icon: BookOpen,
        permission: "canManageClasses",
      },
      {
        title: "Subjects",
        url: "/admin/academic/subjects",
        icon: BookMarked,
        permission: "canManageSubjects",
      },
      {
        title: "Departments",
        url: "/admin/academic/departments",
        icon: Building,
        permission: "canManageDepartments",
      },
    ],
  },
  {
    title: "Assessment",
    items: [
      {
        title: "Grading",
        url: "/admin/grading",
        icon: Award,
        permission: "canManageGrading",
        items: [
          { title: "Grade Book", url: "/admin/grading" },
          { title: "Grade Entry", url: "/admin/grading/entry" },
          { title: "Grade Scale", url: "/admin/grading/scale" },
        ],
      },
      {
        title: "Report Cards",
        url: "/admin/reports",
        icon: FileText,
        permission: "canViewReports",
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        title: "Attendance",
        url: "/admin/attendance",
        icon: ClipboardCheck,
        permission: "canManageAttendance",
        items: [
          { title: "Daily Attendance", url: "/admin/attendance" },
          { title: "Attendance Reports", url: "/admin/attendance/reports" },
          { title: "Leave Requests", url: "/admin/attendance/leave" },
        ],
      },
      {
        title: "Academic Years",
        url: "/admin/academicYears",
        icon: Calendar,
        permission: "canManageAcademicYear",
      },
      {
        title: "Houses",
        url: "/admin/houses",
        icon: Home,
        permission: "canManageHouses",
      },
      {
        title: "Finance",
        url: "/accountant/finance",
        icon: DollarSign,
        permission: "canManageFinance",
        items: [
          { title: "Fee Management", url: "/accountant/finance" },
          { title: "Payments", url: "/accountant/finance/payments" },
          { title: "Invoices", url: "/accountant/finance/invoices" },
          { title: "Reports", url: "/accountant/finance/reports" },
        ],
      },
      {
        title: "Documents",
        url: "/admin/documents",
        icon: FileText,
        permission: "canManageDocuments",
      },
      {
        title: "Timetable",
        url: "/admin/timetable",
        icon: CalendarDays,
        permission: "canViewTimetable",
      },
      {
        title: "Hostel",
        url: "/admin/hostel",
        icon: Hotel,
        permission: "canViewHostel",
      },
      {
        title: "Library",
        url: "/admin/library",
        icon: Library,
        permission: "canViewLibrary",
      },
      {
        title: "Inventory",
        url: "/admin/inventory",
        icon: Package,
        permission: "canViewInventory",
      },
      {
        title: "Transport",
        url: "/admin/transport",
        icon: Bus,
        permission: "canViewTransport",
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
        title: "Communications",
        url: "/admin/communications",
        icon: MessageSquare,
        permission: "canViewCommunications",
      },
    ],
  },
  {
    title: "Personal",
    items: [
      {
        title: "My Profile",
        url: "/profile",
        icon: UserCircle,
        permission: "canViewProfile",
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
        title: "Help & Support",
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
    "Academic",
    "Assessment",
    "Operations",
    "Communication",
    "Personal",
    "System",
  ],
  admin: [
    "Main",
    "Academic",
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
 */
export function getPrefixedNavSections(
  schoolSlug: string,
  sections: NavSection[],
): NavSection[] {
  const safeSlug = schoolSlug.replace(/^\/+/, "");

  return sections.map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      url: `/${safeSlug}${item.url}`,
      items: item.items?.map((subItem) => ({
        ...subItem,
        url: `/${safeSlug}${subItem.url}`,
      })),
    })),
  }));
}
