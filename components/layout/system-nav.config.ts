// config/navigation/system-nav.config.ts - ADD PROFILE LINK
import {
  LayoutDashboard,
  Building2,
  Users,
  Settings,
  Shield,
  Database,
  CreditCard,
  HelpCircle,
  GraduationCap,
  UserCircle,
  UserPlus,
  TicketIcon,
} from "lucide-react";
import type { NavSection } from "@/components/layout/base-sidebar";

export const systemNavSections: NavSection[] = [
  {
    title: "Overview",
    items: [{ title: "Dashboard", url: "/", icon: LayoutDashboard }],
  },
  {
    title: "School Management",
    items: [
      {
        title: "Schools Directory",
        url: "/schools",
        icon: Building2,
        items: [
          { title: "All Schools", url: "/schools" },
          { title: "Add School", url: "/schools/new" },
          { title: "Active Schools", url: "/schools/directory/active" },
          { title: "Suspended", url: "/schools/directory/suspended" },
          { title: "Archived", url: "/schools/directory/archived" },
        ],
      },
    ],
  },
  {
    title: "User Management",
    items: [
      {
        title: "System Users",
        url: "/users",
        icon: Users,
      },
      {
        title: "Access Control",
        url: "/users/access",
        icon: Shield,
        items: [
          { title: "Overview", url: "/users/access" },
          { title: "Roles & Permissions", url: "/users/access/roles" },
        ],
      },
      {
        title: "Add Team Member",
        url: "/team/new",
        icon: UserPlus,
      },
    ],
  },
  {
    title: "Billing & Subscriptions",
    items: [
      {
        title: "Subscriptions",
        url: "/subscriptions",
        icon: CreditCard,
        items: [
          { title: "Active Plans", url: "/subscriptions" },
          { title: "Plans & Pricing", url: "/settings/billing/plans" },
        ],
      },
    ],
  },
  {
    title: "System Configuration",
    items: [
      {
        title: "Global Grading",
        url: "/config/grading",
        icon: GraduationCap,
      },
      {
        title: "Database Admin",
        url: "/system/database",
        icon: Database,
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
      },
    ],
  },
  {
    title: "Settings & Support",
    items: [
      {
        title: "System Settings",
        url: "/settings",
        icon: Settings,
      },
      {
        title: "Support Tickets",
        url: "/support",
        icon: TicketIcon,
      },
    ],
  },
];
