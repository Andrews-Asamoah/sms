"use client";

import { Users, Search, MoreVertical, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface Student {
  id: string;
  studentId: string;
  admissionNumber: string | null;
  profile: {
    firstName: string;
    lastName: string;
    image: string | null;
  };
  status: string;
}

interface ClassStudentsTabProps {
  students: Student[];
}

export function ClassStudentsTab({ students }: ClassStudentsTabProps) {
  const [search, setSearch] = useState("");

  const filteredStudents = students.filter(
    (s) =>
      `${s.profile.firstName} ${s.profile.lastName}`
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      s.studentId.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Enrolled Students</h2>
          <p className="text-sm text-muted-foreground">
            {students.length} students currently enrolled in this class
          </p>
        </div>

        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Photo</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Admission No.</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No students found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={student.profile.image || ""} />
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">
                      {student.profile.firstName} {student.profile.lastName}
                    </TableCell>
                    <TableCell>{student.studentId}</TableCell>
                    <TableCell>{student.admissionNumber || "N/A"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          student.status === "active" ? "secondary" : "outline"
                        }
                        className="capitalize"
                      >
                        {student.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
