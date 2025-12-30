// ============================================
// 2. UPDATED SYSTEM SIDEBAR (NO SCHOOL SWITCHER)
// components/layout/app-sidebar-system.tsx
// ============================================
'use client';
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
  Globe,
} from 'lucide-react';
import { NavMain } from '@/components/layout/nav-main';
import { NavUser } from '@/components/layout/nav-user';
import { CompanyBranding } from '@/components/layout/company-branding';
import { SidebarProvider } from '@/components/layout/sidebar-context';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar';

// Company data
const company = {
  name: 'SchoolMS',
  logo: '/wis-logo.png', // Your company logo
  tagline: 'Super Admin',
};

const data = {
  user: {
    name: 'Super Admin',
    email: 'admin@schoolms.com',
    avatar: '/avatars/admin.jpg',
  },
  navMain: [
    {
      title: 'Overview',
      items: [
        { 
          title: 'Dashboard', 
          url: '/dashboard', 
          icon: LayoutDashboard,
        },
        { 
          title: 'Analytics', 
          url: '/analytics', 
          icon: BarChart3,
        },
        {
          title: 'All Schools',
          url: '/schools',
          icon: Globe,
          badge: '12',
        },
      ],
    },
    {
      title: 'School Management',
      items: [
        { 
          title: 'Schools Directory', 
          url: '/schools/directory', 
          icon: Building2,
          items: [
            { title: 'Active Schools', url: '/schools/directory/active' },
            { title: 'Pending Approval', url: '/schools/directory/pending', badge: '3' },
            { title: 'Suspended', url: '/schools/directory/suspended' },
            { title: 'Archived', url: '/schools/directory/archived' },
          ]
        },
        { 
          title: 'Onboarding', 
          url: '/schools/onboarding', 
          icon: Building2,
          items: [
            { title: 'New Applications', url: '/schools/onboarding/applications', badge: '5' },
            { title: 'Setup Wizard', url: '/schools/onboarding/setup' },
            { title: 'Configuration', url: '/schools/onboarding/config' },
          ]
        },
      ],
    },
    {
      title: 'User Management',
      items: [
        { 
          title: 'System Users', 
          url: '/users', 
          icon: Users,
          items: [
            { title: 'All Users', url: '/users' },
            { title: 'Super Admins', url: '/users/super-admins' },
            { title: 'School Admins', url: '/users/school-admins' },
            { title: 'Support Staff', url: '/users/support' },
          ]
        },
        { 
          title: 'Access Control', 
          url: '/users/access', 
          icon: Shield,
          items: [
            { title: 'Roles & Permissions', url: '/users/access/roles' },
            { title: 'Security Policies', url: '/users/access/policies' },
            { title: 'API Access', url: '/users/access/api' },
          ]
        },
      ],
    },
    {
      title: 'Billing & Subscriptions',
      items: [
        { 
          title: 'Subscriptions', 
          url: '/billing/subscriptions', 
          icon: CreditCard,
          items: [
            { title: 'Overview', url: '/billing/subscriptions' },
            { title: 'Active Plans', url: '/billing/subscriptions/active' },
            { title: 'Trials', url: '/billing/subscriptions/trials', badge: '8' },
            { title: 'Expired', url: '/billing/subscriptions/expired' },
          ]
        },
        { 
          title: 'Plans & Pricing', 
          url: '/billing/plans', 
          icon: FileText,
          items: [
            { title: 'Plan Templates', url: '/billing/plans' },
            { title: 'Pricing Rules', url: '/billing/plans/pricing' },
            { title: 'Feature Toggles', url: '/billing/plans/features' },
          ]
        },
      ],
    },
    {
      title: 'System Configuration',
      items: [
        { 
          title: 'Grading Systems', 
          url: '/config/grading', 
          icon: GraduationCap,
          items: [
            { title: 'All Systems', url: '/config/grading' },
            { title: 'Templates', url: '/config/grading/templates' },
            { title: 'Custom Scales', url: '/config/grading/scales' },
          ]
        },
        { 
          title: 'Database', 
          url: '/system/database', 
          icon: Database,
          items: [
            { title: 'Health Check', url: '/system/database/health' },
            { title: 'Backups', url: '/system/database/backups' },
            { title: 'Migrations', url: '/system/database/migrations' },
            { title: 'Performance', url: '/system/database/performance' },
          ]
        },
        { 
          title: 'Audit & Logs', 
          url: '/system/audit', 
          icon: Shield,
          items: [
            { title: 'Activity Logs', url: '/system/audit/activity' },
            { title: 'Security Events', url: '/system/audit/security' },
            { title: 'Data Changes', url: '/system/audit/changes' },
            { title: 'System Logs', url: '/system/audit/system' },
          ]
        },
      ],
    },
    {
      title: 'Reports & Analytics',
      items: [
        { 
          title: 'Reports', 
          url: '/reports', 
          icon: FileText,
          items: [
            { title: 'System Overview', url: '/reports/overview' },
            { title: 'School Performance', url: '/reports/schools' },
            { title: 'Financial Reports', url: '/reports/financial' },
            { title: 'Usage Statistics', url: '/reports/usage' },
          ]
        },
        { 
          title: 'Insights', 
          url: '/insights', 
          icon: BarChart3,
          items: [
            { title: 'Trends', url: '/insights/trends' },
            { title: 'Predictions', url: '/insights/predictions' },
            { title: 'Benchmarks', url: '/insights/benchmarks' },
          ]
        },
      ],
    },
    {
      title: 'Settings & Support',
      items: [
        { 
          title: 'System Settings', 
          url: '/settings', 
          icon: Settings,
          items: [
            { title: 'General', url: '/settings/general' },
            { title: 'Email & Notifications', url: '/settings/email' },
            { title: 'API Configuration', url: '/settings/api' },
            { title: 'Integrations', url: '/settings/integrations' },
            { title: 'Security', url: '/settings/security' },
          ]
        },
        { 
          title: 'Help & Support', 
          url: '/support', 
          icon: HelpCircle,
          items: [
            { title: 'Documentation', url: '/support/docs' },
            { title: 'Support Tickets', url: '/support/tickets' },
            { title: 'System Status', url: '/support/status' },
          ]
        },
      ],
    },
  ],
};

export function AppSidebarSystem({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader>
          <CompanyBranding
            name={company.name}
            logo={company.logo}
            tagline={company.tagline}
          />
        </SidebarHeader>
        <SidebarContent>
          {data.navMain.map((section) => (
            <NavMain key={section.title} title={section.title} items={section.items} />
          ))}
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={data.user} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    </SidebarProvider>
  );
}