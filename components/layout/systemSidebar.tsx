// ============================================
// SYSTEM SIDEBAR COMPONENT (UPDATED)
// components/app-sidebar-system.tsx
// ============================================
'use client';
import * as React from 'react';
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
} from 'lucide-react';
import { NavMain } from '@/components/layout/nav-main';
import { NavUser } from '@/components/layout/nav-user';
import { SchoolSwitcher } from '@/components/layout/school-switcher';
import { SidebarProvider } from '@/components/layout/sidebar-context';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar';

// Mock data - Replace with actual data from your backend
const schools = [
  {
    name: "St. Mary's High School",
    slug: 'st-marys-hs',
    logo: '/schools/st-marys.png',
    plan: 'Premium',
  },
  {
    name: 'Grace Academy',
    slug: 'grace-academy',
    logo: '/schools/grace.png',
    plan: 'Standard',
  },
  {
    name: 'Riverside International',
    slug: 'riverside-intl',
    logo: '/schools/riverside.png',
    plan: 'Premium',
  },
];

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
        { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
        { title: 'Analytics', url: '/analytics', icon: BarChart3 },
      ],
    },
    {
      title: 'Management',
      items: [
        { 
          title: 'Schools', 
          url: '/schools', 
          icon: Building2, 
          badge: '12',
          items: [
            { title: 'All Schools', url: '/schools' },
            { title: 'Add New School', url: '/schools/new' },
            { title: 'School Requests', url: '/schools/requests', badge: '3' },
            { title: 'Archived', url: '/schools/archived' },
          ]
        },
        { 
          title: 'Users', 
          url: '/users', 
          icon: Users,
          items: [
            { title: 'All Users', url: '/users' },
            { title: 'Administrators', url: '/users/admins' },
            { title: 'Roles & Permissions', url: '/users/roles' },
          ]
        },
        { 
          title: 'Subscriptions', 
          url: '/subscriptions', 
          icon: CreditCard,
          items: [
            { title: 'Active Plans', url: '/subscriptions' },
            { title: 'Billing History', url: '/subscriptions/billing' },
            { title: 'Plan Management', url: '/subscriptions/plans' },
          ]
        },
      ],
    },
    {
      title: 'System',
      items: [
        { 
          title: 'Grading Systems', 
          url: '/grading-systems', 
          icon: GraduationCap,
          items: [
            { title: 'All Systems', url: '/grading-systems' },
            { title: 'Create System', url: '/grading-systems/new' },
            { title: 'Templates', url: '/grading-systems/templates' },
          ]
        },
        { 
          title: 'Database', 
          url: '/database', 
          icon: Database,
          items: [
            { title: 'Overview', url: '/database' },
            { title: 'Backups', url: '/database/backups' },
            { title: 'Maintenance', url: '/database/maintenance' },
          ]
        },
        { 
          title: 'Audit Logs', 
          url: '/audit-logs', 
          icon: Shield,
          items: [
            { title: 'Recent Activity', url: '/audit-logs' },
            { title: 'Security Events', url: '/audit-logs/security' },
            { title: 'Data Changes', url: '/audit-logs/changes' },
          ]
        },
        { 
          title: 'Reports', 
          url: '/reports', 
          icon: FileText,
          items: [
            { title: 'System Reports', url: '/reports' },
            { title: 'Usage Statistics', url: '/reports/usage' },
            { title: 'Performance', url: '/reports/performance' },
          ]
        },
      ],
    },
    {
      title: 'Configuration',
      items: [
        { 
          title: 'Settings', 
          url: '/settings', 
          icon: Settings,
          items: [
            { title: 'General', url: '/settings' },
            { title: 'Email Configuration', url: '/settings/email' },
            { title: 'API Keys', url: '/settings/api' },
            { title: 'Integrations', url: '/settings/integrations' },
          ]
        },
        { title: 'Help & Support', url: '/support', icon: HelpCircle },
      ],
    },
  ],
};

export function AppSidebarSystem({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader>
          <SchoolSwitcher schools={schools} currentSlug={'wis'} />
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