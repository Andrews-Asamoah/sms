"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Calendar, Check, ChevronsUpDown } from "lucide-react";
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
import { useEffect, useState } from "react";

interface AcademicYear {
  id: string;
  name: string;
  isCurrent: boolean;
}

export function WorkingYearSwitcher() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchYears() {
      try {
        const res = await fetch(`/api/schools/${schoolSlug}/academic-years`);
        if (res.ok) {
          const data = await res.json();
          setYears(data);

          // Check for working year in cookie
          const cookies = document.cookie.split(";");
          const workingYearCookie = cookies.find((c) =>
            c.trim().startsWith("sms_working_academic_year="),
          );

          if (workingYearCookie) {
            setSelectedYearId(workingYearCookie.split("=")[1]);
          } else {
            // Default to the one marked isCurrent OR the first one
            const current = data.find((y: AcademicYear) => y.isCurrent);
            if (current) setSelectedYearId(current.id);
          }
        }
      } catch (error) {
        console.error("Failed to fetch academic years", error);
      } finally {
        setLoading(false);
      }
    }

    if (schoolSlug) {
      fetchYears();
    }
  }, [schoolSlug]);

  const handleSelect = (yearId: string) => {
    setSelectedYearId(yearId);
    setOpen(false);

    // Set cookie (valid for 7 days)
    const expires = new Date();
    expires.setTime(expires.getTime() + 7 * 24 * 60 * 60 * 1000);
    document.cookie = `sms_working_academic_year=${yearId};path=/;expires=${expires.toUTCString()}`;

    // Refresh to apply changes if needed, or just let APIs handle it
    router.refresh();
  };

  const selectedYear = years.find((y) => y.id === selectedYearId);

  if (loading) return null;

  return (
    <div className="px-3 py-2">
      <p className="text-xs font-medium text-muted-foreground mb-1 px-1">
        Working Academic Year
      </p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-background/50 hover:bg-background h-8 text-xs"
          >
            <Calendar className="mr-2 h-3 w-3 shrink-0 opacity-50" />
            {selectedYear ? selectedYear.name : "Select Year..."}
            <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandInput
              placeholder="Search year..."
              className="h-8 text-xs"
            />
            <CommandList>
              <CommandEmpty>No year found.</CommandEmpty>
              <CommandGroup>
                {years.map((year) => (
                  <CommandItem
                    key={year.id}
                    value={year.id}
                    onSelect={() => handleSelect(year.id)}
                    className="text-xs"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-3 w-3",
                        selectedYearId === year.id
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    {year.name}
                    {year.isCurrent && (
                      <span className="ml-auto text-[10px] bg-primary/10 text-primary px-1 rounded">
                        Global
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
