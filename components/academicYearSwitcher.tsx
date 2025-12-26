"use client";

import { AcademicYear } from "@prisma/client";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "./ui/command";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { useAcademicYearModal } from "@/hooks/use-academicYear-modal";
import {
  Calendar,
  CalendarDays,
  Check,
  ChevronsUpDown,
  PlusCircle,
} from "lucide-react";

type PopoverTriggerProps = React.ComponentPropsWithoutRef<
  typeof PopoverTrigger
>;

interface AcademicYearSwitcherProps extends PopoverTriggerProps {
  items: AcademicYear[];
}
const AcademicYearSwitcher = ({
  className,
  items = [],
}: AcademicYearSwitcherProps) => {
  const academicYearModal = useAcademicYearModal();
  const formattedYears = items.map((item) => ({
    label: item.name,
    value: item.id,
  }));

  //   const currentYear = formattedYears.find((item) => item.value);
  const [currentYear, setCurrentYear] = useState<{
    label: string;
    value: string;
  } | null>(formattedYears[0] || null);

  const [open, setOpen] = useState(false);

  const onAcademicYearSelect = (year: { value: string; label: string }) => {
    setCurrentYear(year);
    setOpen(false);
    // router.push(`/${year.value}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          aria-label="Select Academic Year"
          className={cn("w-[200px] justify-between", className)}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {currentYear?.label}
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandList>
            <CommandInput placeholder="Search Academic year..." />
            <CommandEmpty>No Academic Year found.</CommandEmpty>
            <CommandGroup heading="Academic Years">
              {formattedYears.map((year) => (
                <CommandItem
                  key={year.value}
                  onSelect={() => onAcademicYearSelect(year)}
                  className="text-sm"
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {year.label}
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      currentYear?.value === year.value
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          <CommandSeparator />
          <CommandList>
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  academicYearModal.onOpen();
                }}
              >
                <PlusCircle className="mr-2 h-5 w-5" />
                Create Academic Year
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default AcademicYearSwitcher;
