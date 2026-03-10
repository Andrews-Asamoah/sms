"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Loader2 } from "lucide-react";

interface StudentStatusDropdownProps {
  studentId: string;
  currentStatus: string;
  schoolSlug: string;
}

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-500/10 text-green-700 border-green-200",
  GRADUATED: "bg-blue-500/10 text-blue-700 border-blue-200",
  WITHDRAWN: "bg-orange-500/10 text-orange-700 border-orange-200",
  SUSPENDED: "bg-red-500/10 text-red-700 border-red-200",
  TRANSFERRED: "bg-purple-500/10 text-purple-700 border-purple-200",
  EXPELLED: "bg-gray-500/10 text-gray-700 border-gray-500 text-destructive",
};

const statuses = [
  "ACTIVE",
  "GRADUATED",
  "WITHDRAWN",
  "SUSPENDED",
  "TRANSFERRED",
  "EXPELLED",
];

export function StudentStatusDropdown({
  studentId,
  currentStatus,
  schoolSlug,
}: StudentStatusDropdownProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) return;

    setIsUpdating(true);
    try {
      const response = await fetch(
        `/api/schools/${schoolSlug}/students/${studentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update status");
      }

      toast.success("Status updated", {
        description: `Student status changed to ${newStatus}`,
      });
      router.refresh();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Update failed", {
        description:
          error instanceof Error ? error.message : "Please try again later",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger disabled={isUpdating} className="focus:outline-none">
        <Badge
          variant="outline"
          className={`${statusColors[currentStatus] || "bg-gray-100 text-gray-800"} flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity px-3 py-1 text-sm`}
        >
          {isUpdating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              {currentStatus}
              <ChevronDown className="h-3 w-3 opacity-50 ml-1" />
            </>
          )}
        </Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {statuses.map((status) => (
          <DropdownMenuItem
            key={status}
            onClick={() => handleStatusChange(status)}
            disabled={status === currentStatus}
            className="flex items-center justify-between cursor-pointer"
          >
            {status}
            {status === currentStatus && (
              <span className="h-2 w-2 rounded-full bg-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
