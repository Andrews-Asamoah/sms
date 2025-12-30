// ============================================
// SCHOOL SIDEBAR COMPONENT (UPDATED)
// components/app-sidebar-school.tsx
// ============================================
'use client';
import * as React from 'react';
import { useParams } from 'next/navigation';
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
} from 'lucide-react';
import { NavMain } from '@/components/layout/nav-main';
import { NavUser } from '@/components/layout/nav-user';
import { ThemeToggle } from '../shared/theme-toggle';
import { SidebarProvider } from '@/components/layout/sidebar-context';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';

// Mock data - Replace with actual school data from your backend
const schoolData = {
  name: "St. Mary's High School",
  logo: '/schools/st-marys.png',
  plan: 'Premium',
};

const data = {
  user: {
    name: 'John Doe',
    email: 'john.doe@school.edu',
    avatar: '/avatars/user.jpg',
  },
  navMain: [
    {
      title: 'Main',
      items: [
        { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
        { title: 'Analytics', url: '/analytics', icon: BarChart3 },
      ],
    },
    {
      title: 'Academic',
      items: [
        { 
          title: 'Students', 
          url: '/students', 
          icon: Users,
          items: [
            { title: 'All Students', url: '/students' },
            { title: 'Enrollments', url: '/students/enrollments' },
            { title: 'Promotions', url: '/students/promotions' },
          ]
        },
        { 
          title: 'Teachers', 
          url: '/teachers', 
          icon: UserCog,
          items: [
            { title: 'All Teachers', url: '/teachers' },
            { title: 'Assignments', url: '/teachers/assignments' },
            { title: 'Schedule', url: '/teachers/schedule' },
          ]
        },
        { title: 'Classes', url: '/classes', icon: BookOpen },
        { title: 'Subjects', url: '/subjects', icon: BookMarked },
        { title: 'Departments', url: '/departments', icon: Building },
        { title: 'Houses', url: '/houses', icon: Home },
      ],
    },
    {
      title: 'Assessment',
      items: [
        { 
          title: 'Grading', 
          url: '/grading', 
          icon: Award,
          items: [
            { title: 'Grade Book', url: '/grading' },
            { title: 'Grade Entry', url: '/grading/entry' },
            { title: 'Grade Scale', url: '/grading/scale' },
          ]
        },
        { title: 'Report Cards', url: '/reports', icon: FileText },
        { title: 'Transcripts', url: '/transcripts', icon: GraduationCap, badge: '3' },
      ],
    },
    {
      title: 'Operations',
      items: [
        { 
          title: 'Attendance', 
          url: '/attendance', 
          icon: ClipboardCheck,
          items: [
            { title: 'Daily Attendance', url: '/attendance' },
            { title: 'Attendance Reports', url: '/attendance/reports' },
            { title: 'Leave Requests', url: '/attendance/leave' },
          ]
        },
        { title: 'Academic Year', url: '/academic-year', icon: Calendar },
        { 
          title: 'Finance', 
          url: '/finance', 
          icon: DollarSign,
          items: [
            { title: 'Fee Management', url: '/finance' },
            { title: 'Payments', url: '/finance/payments' },
            { title: 'Invoices', url: '/finance/invoices' },
            { title: 'Reports', url: '/finance/reports' },
          ]
        },
        { title: 'Documents', url: '/documents', icon: FileText },
      ],
    },
    {
      title: 'Communication',
      items: [
        { title: 'Announcements', url: '/announcements', icon: MessageSquare },
        { title: 'Reports', url: '/school-reports', icon: BarChart3 },
      ],
    },
    {
      title: 'System',
      items: [
        { 
          title: 'Settings', 
          url: '/settings', 
          icon: Settings,
          items: [
            { title: 'General', url: '/settings' },
            { title: 'Users & Roles', url: '/settings/users' },
            { title: 'Preferences', url: '/settings/preferences' },
          ]
        },
        { title: 'Help & Support', url: '/support', icon: HelpCircle },
      ],
    },
  ],
};

export function AppSidebarSchool({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const params = useParams();
  const schoolSlug = params.schoolSlug as string;

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <a href={`/${schoolSlug}/dashboard`}>
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
                    <GraduationCap className="size-4 text-white" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{schoolData.name}</span>
                    <span className="truncate text-xs">{schoolData.plan} Plan</span>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          {data.navMain.map((section) => (
            <NavMain
              key={section.title}
              title={section.title}
              items={section.items}
              baseHref={`/${schoolSlug}`}
            />
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