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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSidebar } from "@/components/ui/sidebar";

interface AcademicTerm {
  id: string;
  name: string;
}

interface AcademicYear {
  id: string;
  name: string;
  isCurrent: boolean;
  terms: AcademicTerm[];
}

export function WorkingYearSwitcher({ userId }: { userId: string }) {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const { state } = useSidebar();
  const [open, setOpen] = useState(false);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Robust cookie parser
  const getCookie = (name: string) => {
    if (typeof document === "undefined") return null;
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.startsWith(`${name}=`)) {
        return cookie.substring(name.length + 1) || null;
      }
    }
    return null;
  };

  const setSessionCookie = (name: string, value: string) => {
    // No `expires` → session cookie: cleared when browser is closed
    document.cookie = `${name}=${value};path=/;SameSite=Lax`;
  };

  const clearCookie = (name: string) => {
    document.cookie = `${name}=;path=/;expires=Thu, 01 Jan 1970 00:00:00 UTC;SameSite=Lax`;
  };

  useEffect(() => {
    async function fetchYears() {
      try {
        const res = await fetch(`/api/schools/${schoolSlug}/academic-years`);
        if (!res.ok) return;

        const data: AcademicYear[] = await res.json();
        setYears(data);

        const yearCookie = getCookie(`sms_working_year_${schoolSlug}_${userId}`);
        const termCookie = getCookie(`sms_working_term_${schoolSlug}_${userId}`);

        // 1. Resolve Year
        let activeYear = data.find((y) => y.id === yearCookie) || 
                         data.find((y) => y.isCurrent) || 
                         data[0];
        
        if (activeYear) {
          setSelectedYearId(activeYear.id);
          
          // 2. Resolve Term within that Year
          let activeTerm = activeYear.terms.find((t) => t.id === termCookie) || 
                           activeYear.terms.find((t: any) => t.isCurrent) || 
                           activeYear.terms[0];
          
          if (activeTerm) {
            setSelectedTermId(activeTerm.id);
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

  const handleYearSelect = (yearId: string) => {
    setSelectedYearId(yearId);
    setSelectedTermId(null); // Reset term when year changes
    // Session cookie — cleared when browser closes
    setSessionCookie(`sms_working_year_${schoolSlug}_${userId}`, yearId);
    clearCookie(`sms_working_term_${schoolSlug}_${userId}`);
    toast.success("Academic year changed");
    setTimeout(() => window.location.reload(), 500);
  };

  const handleTermSelect = (termId: string) => {
    setSelectedTermId(termId);
    setOpen(false);
    // Session cookie — cleared when browser closes
    setSessionCookie(`sms_working_term_${schoolSlug}_${userId}`, termId);
    toast.success("Working term updated");
    setTimeout(() => window.location.reload(), 500);
  };

  const selectedYear = years.find((y) => y.id === selectedYearId);
  const selectedTerm = selectedYear?.terms.find((t) => t.id === selectedTermId);

  if (state === "collapsed") return null;

  if (loading)
    return (
      <div className="px-3 py-2 animate-pulse">
        <div className="h-3 w-20 bg-muted rounded mb-2" />
        <div className="h-8 w-full bg-muted rounded" />
      </div>
    );

  return (
    <div className="px-3 py-2 space-y-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-1.5 px-1">
          Working Year
        </p>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between h-9 text-xs border-white/10 bg-white/5 hover:bg-white/10 transition-all rounded-lg"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <Calendar className="h-3 w-3 shrink-0 text-blue-400" />
                <span className="truncate">
                  {selectedYear ? selectedYear.name : "Select Year..."}
                </span>
              </div>
              <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[180px] p-0 bg-popover/95 backdrop-blur-xl border-white/10" align="start">
            <Command className="bg-transparent">
              <CommandInput placeholder="Search academic years..." className="h-9 text-xs" />
              <CommandList>
                <CommandEmpty>No academic year found.</CommandEmpty>
                <CommandGroup heading="Available Years">
                  {years.map((year) => (
                    <CommandItem
                      key={year.id}
                      value={year.id}
                      onSelect={() => handleYearSelect(year.id)}
                      className="text-xs py-2 cursor-pointer"
                    >
                      <Check className={cn("mr-2 h-3.5 w-3.5 text-blue-500", selectedYearId === year.id ? "opacity-100" : "opacity-0")} />
                      <div className="flex flex-col">
                        <span>{year.name}</span>
                        {year.isCurrent && <span className="text-[9px] text-blue-400 font-medium">Global Default</span>}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {selectedYear && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-1.5 px-1">
            Working Term
          </p>
          <Select value={selectedTermId || ""} onValueChange={handleTermSelect}>
            <SelectTrigger className="w-full h-8 text-[10px] border-white/10 bg-white/5 hover:bg-white/10 rounded-lg py-0 px-2">
              <SelectValue placeholder="Select Term" />
            </SelectTrigger>
            <SelectContent className="bg-popover/95 backdrop-blur-xl border-white/10">
              {selectedYear.terms.map((term) => (
                <SelectItem key={term.id} value={term.id} className="text-xs">
                  {term.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
