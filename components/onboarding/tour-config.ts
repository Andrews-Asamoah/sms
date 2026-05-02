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
  Calendar,
  CheckCircle2,
  Trophy,
  Wallet,
  BadgeDollarSign,
} from "lucide-react";
import { type LucideIcon } from "lucide-react";

export interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  features: string[];
  href?: string;
}

export const TOUR_STEPS: Record<string, TourStep[]> = {
  admin: [
    {
      id: "admin-welcome",
      title: "Welcome to your Admin Dashboard",
      description:
        "This is your control center for managing the entire school. Get a bird's-eye view of everything happening in your institution.",
      icon: LayoutDashboard,
      features: [
        "View real-time school statistics",
        "Monitor recent activities",
        "Access quick actions",
        "Check financial health summary",
      ],
      href: "/admin",
    },
    {
      id: "admin-students",
      title: "Manage Students",
      description:
        "Keep track of all enrolled students, their academic records, and general well-being.",
      icon: Users,
      features: [
        "Enroll new students",
        "View and edit student profiles",
        "Track student enrollment trends",
        "Assign students to classes and houses",
      ],
      href: "/admin/students",
    },
    {
      id: "admin-teachers",
      title: "Manage Teachers & Staff",
      description: "Oversee your teaching and non-teaching staff members.",
      icon: Users,
      features: [
        "Invite new teachers",
        "Assign subjects and classes",
        "Manage staff profiles",
        "Monitor staff attendance",
      ],
      href: "/admin/teachers",
    },
    {
      id: "admin-academics",
      title: "Academic Setup",
      description: "Configure the core academic structure of your school.",
      icon: BookOpen,
      features: [
        "Set up academic years and terms",
        "Manage departments and subjects",
        "Configure grading systems",
        "Set up examination periods",
      ],
      href: "/admin/academics",
    },
    {
      id: "admin-classes",
      title: "Classes & Timetable",
      description:
        "Organize students into classes and schedule their learning activities.",
      icon: Calendar,
      features: [
        "Create and manage classes",
        "Assign class teachers",
        "Generate and view timetables",
        "Manage class capacities",
      ],
      href: "/admin/classes",
    },
    {
      id: "admin-attendance",
      title: "Attendance Tracking",
      description: "Monitor daily attendance for both students and staff.",
      icon: CheckCircle2,
      features: [
        "Take daily attendance",
        "View attendance reports",
        "Track absentees",
        "Manage leave requests",
      ],
      href: "/admin/attendance",
    },
    {
      id: "admin-finance",
      title: "Finance & Fees",
      description:
        "Keep your school's finances in check with comprehensive tools.",
      icon: DollarSign,
      features: [
        "Set up fee structures",
        "Track payments and generate invoices",
        "Manage expenses and payroll",
        "View financial reports",
      ],
      href: "/admin/finance",
    },
    {
      id: "admin-reports",
      title: "Reports & Analytics",
      description: "Generate academic and operational reports easily.",
      icon: BarChart3,
      features: [
        "Generate student report cards",
        "Analyze performance trends",
        "Export data to PDF/Excel",
        "Customize report templates",
      ],
      href: "/admin/reports",
    },
    {
      id: "admin-communication",
      title: "Announcements",
      description: "Communicate effectively with staff, students, and parents.",
      icon: MessageSquare,
      features: [
        "Send school-wide announcements",
        "Target specific groups or classes",
        "Manage notifications",
        "Send SMS alerts",
      ],
      href: "/admin/announcements",
    },
    {
      id: "admin-settings",
      title: "School Settings",
      description: "Customize the platform to fit your school's unique needs.",
      icon: Settings,
      features: [
        "Update school profile and logo",
        "Configure system preferences",
        "Manage user roles and permissions",
        "Handle subscription and billing",
      ],
      href: "/admin/settings",
    },
    {
      id: "admin-finish",
      title: "You're all set!",
      description:
        "You now know your way around the Admin Dashboard. If you ever need help, just click the Help icon in the top right.",
      icon: Award,
      features: [
        "Explore the dashboard",
        "Start setting up your school",
        "Invite your team",
      ],
    },
  ],
  owner: [
    {
      id: "owner-welcome",
      title: "Welcome to your Dashboard",
      description:
        "As the owner, you have full access to manage the entire school. Get a bird's-eye view of everything happening in your institution.",
      icon: LayoutDashboard,
      features: [
        "View real-time school statistics",
        "Monitor recent activities",
        "Access quick actions",
        "Check financial health summary",
      ],
      href: "/admin",
    },
    {
      id: "owner-students",
      title: "Manage Students",
      description:
        "Keep track of all enrolled students, their academic records, and general well-being.",
      icon: Users,
      features: [
        "Enroll new students",
        "View and edit student profiles",
        "Track student enrollment trends",
        "Assign students to classes and houses",
      ],
      href: "/admin/students",
    },
    {
      id: "owner-teachers",
      title: "Manage Teachers & Staff",
      description: "Oversee your teaching and non-teaching staff members.",
      icon: Users,
      features: [
        "Invite new teachers",
        "Assign subjects and classes",
        "Manage staff profiles",
        "Monitor staff attendance",
      ],
      href: "/admin/teachers",
    },
    {
      id: "owner-academics",
      title: "Academic Setup",
      description: "Configure the core academic structure of your school.",
      icon: BookOpen,
      features: [
        "Set up academic years and terms",
        "Manage departments and subjects",
        "Configure grading systems",
        "Set up examination periods",
      ],
      href: "/admin/academics",
    },
    {
      id: "owner-classes",
      title: "Classes & Timetable",
      description:
        "Organize students into classes and schedule their learning activities.",
      icon: Calendar,
      features: [
        "Create and manage classes",
        "Assign class teachers",
        "Generate and view timetables",
        "Manage class capacities",
      ],
      href: "/admin/classes",
    },
    {
      id: "owner-attendance",
      title: "Attendance Tracking",
      description: "Monitor daily attendance for both students and staff.",
      icon: CheckCircle2,
      features: [
        "Take daily attendance",
        "View attendance reports",
        "Track absentees",
        "Manage leave requests",
      ],
      href: "/admin/attendance",
    },
    {
      id: "owner-finance",
      title: "Finance & Fees",
      description:
        "Keep your school's finances in check with comprehensive tools.",
      icon: DollarSign,
      features: [
        "Set up fee structures",
        "Track payments and generate invoices",
        "Manage expenses and payroll",
        "View financial reports",
      ],
      href: "/admin/finance",
    },
    {
      id: "owner-reports",
      title: "Reports & Analytics",
      description: "Generate academic and operational reports easily.",
      icon: BarChart3,
      features: [
        "Generate student report cards",
        "Analyze performance trends",
        "Export data to PDF/Excel",
        "Customize report templates",
      ],
      href: "/admin/reports",
    },
    {
      id: "owner-communication",
      title: "Announcements",
      description: "Communicate effectively with staff, students, and parents.",
      icon: MessageSquare,
      features: [
        "Send school-wide announcements",
        "Target specific groups or classes",
        "Manage notifications",
        "Send SMS alerts",
      ],
      href: "/admin/announcements",
    },
    {
      id: "owner-settings",
      title: "School Settings",
      description: "Customize the platform to fit your school's unique needs.",
      icon: Settings,
      features: [
        "Update school profile and logo",
        "Configure system preferences",
        "Manage user roles and permissions",
        "Handle subscription and billing",
      ],
      href: "/admin/settings",
    },
    {
      id: "owner-finish",
      title: "You're all set!",
      description:
        "You now know your way around the Dashboard. If you ever need help, just click the Help icon in the top right.",
      icon: Award,
      features: [
        "Explore the dashboard",
        "Start setting up your school",
        "Invite your team",
      ],
    },
  ],
  teacher: [
    {
      id: "teacher-welcome",
      title: "Welcome, Teacher!",
      description:
        "This is your personal dashboard where you can manage your classes, students, and daily tasks.",
      icon: LayoutDashboard,
      features: [
        "View your daily schedule",
        "Access quick links",
        "See upcoming tasks and announcements",
      ],
      href: "/teacher",
    },
    {
      id: "teacher-classes",
      title: "My Classes",
      description: "Manage the classes you are assigned to teach.",
      icon: Users,
      features: [
        "View class lists and student profiles",
        "Take class attendance",
        "Communicate with your classes",
        "Manage class resources",
      ],
      href: "/teacher/classes",
    },
    {
      id: "teacher-schedule",
      title: "My Schedule",
      description: "Keep track of your classes and activities.",
      icon: Calendar,
      features: [
        "View your weekly timetable",
        "See upcoming periods",
        "Check room assignments",
      ],
      href: "/teacher/schedule",
    },
    {
      id: "teacher-subjects",
      title: "Subjects I Teach",
      description: "Access resources and manage curriculum for your subjects.",
      icon: BookOpen,
      features: [
        "View assigned subjects",
        "Manage lesson plans",
        "Upload study materials",
      ],
      href: "/teacher/subjects",
    },
    {
      id: "teacher-gradebook",
      title: "Gradebook",
      description: "Record and manage student grades and assessments.",
      icon: FileText,
      features: [
        "Enter exam and test scores",
        "Track continuous assessment",
        "Calculate term averages",
        "Submit grades for report cards",
      ],
      href: "/teacher/gradebook",
    },
    {
      id: "teacher-assignments",
      title: "Assignments",
      description: "Create and grade homework and class assignments.",
      icon: FileText,
      features: [
        "Create new assignments",
        "Collect student submissions",
        "Grade and provide feedback",
        "Track completion rates",
      ],
      href: "/teacher/assignments",
    },
    {
      id: "teacher-attendance",
      title: "Attendance",
      description: "Mark attendance for your classes quickly and easily.",
      icon: CheckCircle2,
      features: [
        "Take subject-level attendance",
        "Mark class-level attendance (if form tutor)",
        "View attendance history",
      ],
      href: "/teacher/attendance",
    },
    {
      id: "teacher-salary",
      title: "My Salary & Payroll",
      description: "Access your financial information and payslips.",
      icon: BadgeDollarSign,
      features: [
        "View salary breakdown",
        "Download payslips",
        "Check payment history",
      ],
      href: "/teacher/salary",
    },
    {
      id: "teacher-finish",
      title: "You're all set!",
      description:
        "You are ready to start managing your classes. Have a great term!",
      icon: Award,
      features: [
        "Check your schedule",
        "Review your classes",
        "Start teaching!",
      ],
    },
  ],
  student: [
    {
      id: "student-welcome",
      title: "Welcome to your Student Portal!",
      description:
        "This is your personal space to keep track of your learning, grades, and school activities.",
      icon: LayoutDashboard,
      features: [
        "View your upcoming classes",
        "Check new announcements",
        "See your latest grades",
      ],
      href: "/student",
    },
    {
      id: "student-timetable",
      title: "My Timetable",
      description: "Never miss a class with your personalized schedule.",
      icon: Calendar,
      features: [
        "View daily and weekly classes",
        "Check subject teachers",
        "Find classroom locations",
      ],
      href: "/student/timetable",
    },
    {
      id: "student-grades",
      title: "My Grades & Reports",
      description: "Track your academic progress throughout the year.",
      icon: FileText,
      features: [
        "View continuous assessment scores",
        "Check exam results",
        "Download terminal report cards",
        "Track your academic performance",
      ],
      href: "/student/grades",
    },
    {
      id: "student-attendance",
      title: "Attendance Record",
      description: "Keep an eye on your attendance history.",
      icon: CheckCircle2,
      features: [
        "View overall attendance percentage",
        "Check daily attendance status",
        "See days marked absent",
      ],
      href: "/student/attendance",
    },
    {
      id: "student-classmates",
      title: "My Classmates",
      description: "Connect with your peers in your class.",
      icon: Users,
      features: [
        "View class list",
        "See class teachers",
        "Check class information",
      ],
      href: "/student/classmates",
    },
    {
      id: "student-clubs",
      title: "Clubs & Activities",
      description: "Participate in extracurricular activities.",
      icon: Trophy,
      features: [
        "View joined clubs",
        "Explore available clubs",
        "Check club meetings and events",
      ],
      href: "/student/clubs",
    },
    {
      id: "student-finish",
      title: "You're all set!",
      description:
        "Enjoy your learning experience. You can always replay this tour from the Help menu.",
      icon: Award,
      features: ["Check your timetable", "View your grades", "Stay updated!"],
    },
  ],
  guardian: [
    {
      id: "guardian-welcome",
      title: "Welcome, Guardian!",
      description:
        "This portal helps you stay connected with your children's education and school activities.",
      icon: LayoutDashboard,
      features: [
        "Overview of all your children",
        "Quick access to reports and fees",
        "Recent school announcements",
      ],
      href: "/guardian",
    },
    {
      id: "guardian-children",
      title: "My Children",
      description: "Monitor the academic and general progress of your wards.",
      icon: Users,
      features: [
        "View individual student profiles",
        "Check daily attendance",
        "Monitor class participation",
        "View teachers' details",
      ],
      href: "/guardian/children",
    },
    {
      id: "guardian-fees",
      title: "Fees & Payments",
      description: "Manage school fees and financial obligations easily.",
      icon: DollarSign,
      features: [
        "View fee structures and balances",
        "Make secure online payments",
        "Download payment receipts",
        "Track payment history",
      ],
      href: "/guardian/fees",
    },
    {
      id: "guardian-reports",
      title: "Progress Reports",
      description: "Access and review your children's academic performance.",
      icon: FileText,
      features: [
        "View terminal report cards",
        "Check continuous assessment scores",
        "Track academic progress over time",
        "Download reports as PDF",
      ],
      href: "/guardian/reports",
    },
    {
      id: "guardian-communications",
      title: "Communications",
      description: "Stay in touch with the school administration and teachers.",
      icon: MessageSquare,
      features: [
        "Read school announcements",
        "Receive important notifications",
        "Message class teachers",
        "Respond to school requests",
      ],
      href: "/guardian/communications",
    },
    {
      id: "guardian-finish",
      title: "You're all set!",
      description:
        "You're ready to stay engaged with your child's education. Have a great year!",
      icon: Award,
      features: [
        "Check academic progress",
        "Review fee balances",
        "Stay informed",
      ],
    },
  ],
  accountant: [
    {
      id: "accountant-welcome",
      title: "Welcome to the Finance Portal!",
      description:
        "Your central hub for managing all school finances, from fee collection to payroll.",
      icon: LayoutDashboard,
      features: [
        "View financial summaries",
        "Monitor daily transactions",
        "Access quick actions",
      ],
      href: "/accountant",
    },
    {
      id: "accountant-finance",
      title: "Finance Overview",
      description: "Get a detailed look at the school's financial health.",
      icon: BarChart3,
      features: [
        "View revenue vs expense charts",
        "Track cash flow",
        "Monitor outstanding fees",
        "Generate financial reports",
      ],
      href: "/accountant/finance",
    },
    {
      id: "accountant-invoices",
      title: "Invoices & Fees",
      description: "Manage student billing and fee structures.",
      icon: FileText,
      features: [
        "Generate termly fee invoices",
        "Set up fee categories",
        "Apply discounts and scholarships",
        "Track outstanding balances",
      ],
      href: "/accountant/invoices",
    },
    {
      id: "accountant-payments",
      title: "Payments Collection",
      description: "Record and track incoming payments.",
      icon: Wallet,
      features: [
        "Record manual payments",
        "Track online transactions",
        "Issue payment receipts",
        "Reconcile accounts",
      ],
      href: "/accountant/payments",
    },
    {
      id: "accountant-expenses",
      title: "Expense Management",
      description: "Keep track of school expenditures and purchases.",
      icon: DollarSign,
      features: [
        "Record daily expenses",
        "Categorize spending",
        "Manage vendor payments",
        "Track budget utilization",
      ],
      href: "/accountant/expenses",
    },
    {
      id: "accountant-payroll",
      title: "Payroll",
      description: "Manage staff salaries and compensation.",
      icon: BadgeDollarSign,
      features: [
        "Process monthly payroll",
        "Manage deductions and bonuses",
        "Generate payslips",
        "Track salary payments",
      ],
      href: "/accountant/finance/payroll",
    },
    {
      id: "accountant-finish",
      title: "You're all set!",
      description: "You're ready to manage the school's finances efficiently.",
      icon: Award,
      features: [
        "Review financial status",
        "Process payments",
        "Generate reports",
      ],
    },
  ],
};
