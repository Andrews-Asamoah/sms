"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ClassOption {
  id: string;
  name: string;
}

interface StudentClassFilterProps {
  classes: ClassOption[];
  currentClassId: string | null;
}

export function StudentClassFilter({
  classes,
  currentClassId,
}: StudentClassFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleClassChange = (classId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (classId === "all") {
      params.delete("classId");
      // Optionally we could set it to "all" explicitly, but here we can just update to all
      params.set("classId", "all");
    } else {
      params.set("classId", classId);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Select
      value={currentClassId ?? undefined}
      onValueChange={handleClassChange}
    >
      <SelectTrigger className="w-[200px] h-11 bg-background">
        <SelectValue placeholder="Select a class..." />
      </SelectTrigger>
      <SelectContent className="max-h-[250px] overflow-y-auto">
        <SelectItem value="all">All Classes</SelectItem>
        {classes.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
