// config/navigation/school-nav.config.ts
import {
  LayoutDashboard,
  Users,
  GraduationCap,
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
} from "lucide-react";
import type { NavSection } from "@/components/layout/base-sidebar";

export const schoolNavSections: NavSection[] = [
  {
    title: "Main",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Analytics", url: "/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Academic",
    items: [
      {
        title: "Students",
        url: "/students",
        icon: Users,
        items: [
          { title: "All Students", url: "/students" },
          { title: "Enrollments", url: "/students/enrollments" },
          { title: "Promotions", url: "/students/promotions" },
        ],
      },
      {
        title: "Teachers",
        url: "/teachers",
        icon: UserCog,
        items: [
          { title: "All Teachers", url: "/teachers" },
          { title: "Assignments", url: "/teachers/assignments" },
          { title: "Schedule", url: "/teachers/schedule" },
        ],
      },
      { title: "Classes", url: "/classes", icon: BookOpen },
      { title: "Subjects", url: "/subjects", icon: BookMarked },
      { title: "Departments", url: "/departments", icon: Building },
      { title: "Houses", url: "/houses", icon: Home },
    ],
  },
  {
    title: "Assessment",
    items: [
      {
        title: "Grading",
        url: "/grading",
        icon: Award,
        items: [
          { title: "Grade Book", url: "/grading" },
          { title: "Grade Entry", url: "/grading/entry" },
          { title: "Grade Scale", url: "/grading/scale" },
        ],
      },
      { title: "Report Cards", url: "/reports", icon: FileText },
      {
        title: "Transcripts",
        url: "/transcripts",
        icon: GraduationCap,
        badge: "3",
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        title: "Attendance",
        url: "/attendance",
        icon: ClipboardCheck,
        items: [
          { title: "Daily Attendance", url: "/attendance" },
          { title: "Attendance Reports", url: "/attendance/reports" },
          { title: "Leave Requests", url: "/attendance/leave" },
        ],
      },
      { title: "Academic Year", url: "/academic-year", icon: Calendar },
      {
        title: "Finance",
        url: "/finance",
        icon: DollarSign,
        items: [
          { title: "Fee Management", url: "/finance" },
          { title: "Payments", url: "/finance/payments" },
          { title: "Invoices", url: "/finance/invoices" },
          { title: "Reports", url: "/finance/reports" },
        ],
      },
      { title: "Documents", url: "/documents", icon: FileText },
    ],
  },
  {
    title: "Communication",
    items: [
      { title: "Announcements", url: "/announcements", icon: MessageSquare },
      { title: "Reports", url: "/school-reports", icon: BarChart3 },
    ],
  },
  {
    title: "System",
    items: [
      {
        title: "Settings",
        url: "/settings",
        icon: Settings,
        items: [
          { title: "General", url: "/settings" },
          { title: "Users & Roles", url: "/settings/users" },
          { title: "Preferences", url: "/settings/preferences" },
        ],
      },
      { title: "Help & Support", url: "/support", icon: HelpCircle },
    ],
  },
];

/**
 * Utility function to prefix all navigation URLs with a school slug
 * @param prefix - The prefix to add (e.g., "/school-slug")
 * @param sections - The navigation sections to prefix
 * @returns Prefixed navigation sections
 */
export function getPrefixedNavSections(
  prefix: string,
  sections: NavSection[]
): NavSection[] {
  return sections.map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      url: `${prefix}${item.url}`,
      items: item.items?.map((subItem) => ({
        ...subItem,
        url: `${prefix}${subItem.url}`,
      })),
    })),
  }));
}
