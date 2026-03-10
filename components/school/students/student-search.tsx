"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { useParams } from "next/navigation";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface StudentSearchProps {
  onSelect: (student: { id: string; name: string }) => void;
  className?: string;
}

export function StudentSearch({ onSelect, className }: StudentSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [students, setStudents] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const { schoolSlug } = useParams<{ schoolSlug: string }>();

  React.useEffect(() => {
    if (value.length < 2) return;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/schools/${schoolSlug}/students?search=${value}`,
        );
        if (res.ok) {
          const data = await res.json();
          setStudents(data);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value, schoolSlug]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {value ? value : "Search student..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput
            placeholder="Type name or student ID..."
            onValueChange={setValue}
          />
          <CommandList>
            <CommandEmpty>
              {loading ? "Searching..." : "No student found."}
            </CommandEmpty>
            <CommandGroup>
              {students.map((student) => (
                <CommandItem
                  key={student.id}
                  value={student.id}
                  onSelect={() => {
                    const name = `${student.profile.firstName} ${student.profile.lastName}`;
                    onSelect({ id: student.id, name });
                    setOpen(false);
                    setValue(name);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === student.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {student.profile.firstName} {student.profile.lastName}
                      </span>
                      {student.bills?.length > 0 && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full dark:bg-amber-900/30 dark:text-amber-400 font-bold">
                          {student.bills.length} Bill(s)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-0.5">
                      <span>
                        {student.studentId} •{" "}
                        {student.class?.name || "No Class"}
                      </span>
                      {student.bills?.length > 0 && (
                        <span className="font-mono text-emerald-600 dark:text-emerald-400">
                          GHS{" "}
                          {student.bills
                            .reduce(
                              (sum: number, b: any) =>
                                sum + Number(b.balanceAmount),
                              0,
                            )
                            .toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
