// components/school/students/student-actions.tsx
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { MoreHorizontal, Eye, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Student } from "./columns";

interface StudentActionsProps {
  student: Student;
}

export function StudentActions({ student }: StudentActionsProps) {
  const pathname = usePathname();
  const schoolSlug = pathname.split("/")[1];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => navigator.clipboard.writeText(student.id)}
        >
          Copy student ID
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/${schoolSlug}/admin/students/${student.id}`}>
            <Eye className="mr-2 h-4 w-4" />
            View details
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/${schoolSlug}/admin/students/${student.id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Edit student
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
