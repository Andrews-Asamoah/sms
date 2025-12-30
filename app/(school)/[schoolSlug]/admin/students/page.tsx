// app/(school)/[schoolSlug]/admin/students/page.tsx
'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, Column } from '@/components/shared/data-table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  GraduationCap,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  Download,
  Upload,
  Mail,
  Phone,
} from 'lucide-react';

// Sample data type
interface Student {
  id: string;
  studentId: string;
  name: string;
  email: string;
  phone: string;
  class: string;
  gender: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'GRADUATED';
  admissionDate: string;
  avatar?: string;
}

// Sample data
const SAMPLE_STUDENTS: Student[] = [
  {
    id: '1',
    studentId: 'STU001',
    name: 'Alice Johnson',
    email: 'alice.j@student.edu',
    phone: '+233 24 123 4567',
    class: 'Form 3A',
    gender: 'Female',
    status: 'ACTIVE',
    admissionDate: '2022-09-01',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
  },
  {
    id: '2',
    studentId: 'STU002',
    name: 'Robert Smith',
    email: 'robert.s@student.edu',
    phone: '+233 24 234 5678',
    class: 'Form 3A',
    gender: 'Male',
    status: 'ACTIVE',
    admissionDate: '2022-09-01',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Robert',
  },
  {
    id: '3',
    studentId: 'STU003',
    name: 'Emma Williams',
    email: 'emma.w@student.edu',
    phone: '+233 24 345 6789',
    class: 'Form 2B',
    gender: 'Female',
    status: 'ACTIVE',
    admissionDate: '2023-09-01',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
  },
  {
    id: '4',
    studentId: 'STU004',
    name: 'Michael Brown',
    email: 'michael.b@student.edu',
    phone: '+233 24 456 7890',
    class: 'Form 1C',
    gender: 'Male',
    status: 'SUSPENDED',
    admissionDate: '2024-09-01',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
  },
];

const ADMIN_NAV_ITEMS = [
  { title: 'Dashboard', href: '/admin/dashboard', icon: GraduationCap },
  { title: 'Students', href: '/admin/students', icon: GraduationCap },
  // ... other nav items
];

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>(SAMPLE_STUDENTS);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const columns: Column<Student>[] = [
    {
      key: 'studentId',
      label: 'Student ID',
      sortable: true,
      className: 'font-mono',
    },
    {
      key: 'name',
      label: 'Student Name',
      sortable: true,
      render: (student) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={student.avatar} alt={student.name} />
            <AvatarFallback>{student.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{student.name}</p>
            <p className="text-sm text-slate-500">{student.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'class',
      label: 'Class',
      sortable: true,
      render: (student) => (
        <Badge variant="secondary">{student.class}</Badge>
      ),
    },
    {
      key: 'gender',
      label: 'Gender',
      sortable: true,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (student) => {
        const statusConfig = {
          ACTIVE: { label: 'Active', variant: 'default' as const },
          SUSPENDED: { label: 'Suspended', variant: 'destructive' as const },
          GRADUATED: { label: 'Graduated', variant: 'secondary' as const },
        };
        const config = statusConfig[student.status];
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      key: 'admissionDate',
      label: 'Admission Date',
      sortable: true,
      render: (student) =>
        new Date(student.admissionDate).toLocaleDateString('en-GB'),
    },
  ];

  const handleViewStudent = (student: Student) => {
    setSelectedStudent(student);
    setIsViewDialogOpen(true);
  };

  const handleDeleteStudent = (student: Student) => {
    if (confirm(`Are you sure you want to delete ${student.name}?`)) {
      setStudents((prev) => prev.filter((s) => s.id !== student.id));
    }
  };

  const renderActions = (student: Student) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleViewStudent(student)}>
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Edit className="mr-2 h-4 w-4" />
          Edit Student
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Mail className="mr-2 h-4 w-4" />
          Send Email
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => handleDeleteStudent(student)}
          className="text-red-600"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <DashboardLayout
      navItems={ADMIN_NAV_ITEMS}
      user={{
        name: 'Dr. Sarah Johnson',
        email: 'sarah.johnson@school.edu',
        role: 'Administrator',
        image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
      }}
      school={{
        name: 'Springfield High School',
        logo: undefined,
      }}
    >
      <PageHeader
        title="Students"
        description="Manage all students enrolled in your school"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Students' },
        ]}
        action={{
          label: 'Add Student',
          icon: UserPlus,
          onClick: () => setIsAddDialogOpen(true),
        }}
      />

      {/* Bulk Actions */}
      <div className="flex gap-2 mb-4">
        <Button variant="outline" size="sm">
          <Upload className="mr-2 h-4 w-4" />
          Import CSV
        </Button>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export Data
        </Button>
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-6">
          <DataTable
            columns={columns}
            data={students}
            searchPlaceholder="Search students..."
            actions={renderActions}
            onRowClick={handleViewStudent}
          />
        </CardContent>
      </Card>

      {/* Add Student Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
            <DialogDescription>
              Enter the student's information below
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" placeholder="John" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" placeholder="Doe" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="john.doe@student.edu" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" placeholder="+233 24 123 4567" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="class">Class</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="form1a">Form 1A</SelectItem>
                    <SelectItem value="form1b">Form 1B</SelectItem>
                    <SelectItem value="form2a">Form 2A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button>Add Student</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Student Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={selectedStudent.avatar} />
                  <AvatarFallback>{selectedStudent.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">{selectedStudent.name}</h3>
                  <p className="text-slate-500">{selectedStudent.studentId}</p>
                  <Badge className="mt-2">
                    {selectedStudent.status}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-500">Email</Label>
                  <p className="font-medium">{selectedStudent.email}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Phone</Label>
                  <p className="font-medium">{selectedStudent.phone}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Class</Label>
                  <p className="font-medium">{selectedStudent.class}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Gender</Label>
                  <p className="font-medium">{selectedStudent.gender}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Admission Date</Label>
                  <p className="font-medium">
                    {new Date(selectedStudent.admissionDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            <Button>Edit Student</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}