// config/navigation/system-nav.config.ts
import {
  LayoutDashboard,
  Building2,
  Users,
  Settings,
  Shield,
  Database,
  CreditCard,
  BarChart3,
  FileText,
  HelpCircle,
  GraduationCap,
} from "lucide-react";
import type { NavSection } from "@/components/layout/base-sidebar";

export const systemNavSections: NavSection[] = [
  {
    title: "Overview",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Analytics", url: "/analytics", icon: BarChart3 },
    ],
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
      {
        title: "Onboarding",
        url: "/schools/onboarding",
        icon: Building2,
        items: [
          {
            title: "New Applications",
            url: "/schools/onboarding/applications",
            badge: "5",
          },
          { title: "Setup Wizard", url: "/schools/onboarding/setup" },
          { title: "Configuration", url: "/schools/onboarding/config" },
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
        items: [
          { title: "All Users", url: "/users" },
          { title: "Super Admins", url: "/users/super-admins" },
          { title: "School Admins", url: "/users/school-admins" },
          { title: "Support Staff", url: "/users/support" },
        ],
      },
      {
        title: "Access Control",
        url: "/users/access",
        icon: Shield,
        items: [
          { title: "Roles & Permissions", url: "/users/access/roles" },
          { title: "Security Policies", url: "/users/access/policies" },
          { title: "API Access", url: "/users/access/api" },
        ],
      },
    ],
  },
  {
    title: "Billing & Subscriptions",
    items: [
      {
        title: "Subscriptions",
        url: "/billing/subscriptions",
        icon: CreditCard,
        items: [
          { title: "Overview", url: "/billing/subscriptions" },
          { title: "Active Plans", url: "/billing/subscriptions/active" },
          {
            title: "Trials",
            url: "/billing/subscriptions/trials",
            badge: "8",
          },
          { title: "Expired", url: "/billing/subscriptions/expired" },
        ],
      },
      {
        title: "Plans & Pricing",
        url: "/billing/plans",
        icon: FileText,
        items: [
          { title: "Plan Templates", url: "/billing/plans" },
          { title: "Pricing Rules", url: "/billing/plans/pricing" },
          { title: "Feature Toggles", url: "/billing/plans/features" },
        ],
      },
    ],
  },
  {
    title: "System Configuration",
    items: [
      {
        title: "Grading Systems",
        url: "/config/grading",
        icon: GraduationCap,
        items: [
          { title: "All Systems", url: "/config/grading" },
          { title: "Templates", url: "/config/grading/templates" },
          { title: "Custom Scales", url: "/config/grading/scales" },
        ],
      },
      {
        title: "Database",
        url: "/system/database",
        icon: Database,
        items: [
          { title: "Health Check", url: "/system/database/health" },
          { title: "Backups", url: "/system/database/backups" },
          { title: "Migrations", url: "/system/database/migrations" },
          { title: "Performance", url: "/system/database/performance" },
        ],
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
        items: [
          { title: "General", url: "/settings/general" },
          { title: "Email & Notifications", url: "/settings/email" },
          { title: "Security", url: "/settings/security" },
        ],
      },
      { title: "Help & Support", url: "/support", icon: HelpCircle },
    ],
  },
];
