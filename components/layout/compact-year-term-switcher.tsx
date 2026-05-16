"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Calendar, Check, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import type { AcademicYearOption } from "@/lib/layout/get-role-layout-data";

const PRIVILEGED_ROLES = ["admin", "owner", "accountant", "headteacher", "superAdmin"];

// Shared cookie helpers — session-scoped (no expiry = deleted when browser closes)
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  for (const cookie of document.cookie.split(";")) {
    const c = cookie.trim();
    if (c.startsWith(`${name}=`)) return c.substring(name.length + 1) || null;
  }
  return null;
}

function setSessionCookie(name: string, value: string) {
  // No `expires` → session cookie: cleared when browser is closed
  document.cookie = `${name}=${value};path=/;SameSite=Lax`;
}

function clearCookie(name: string) {
  document.cookie = `${name}=;path=/;expires=Thu, 01 Jan 1970 00:00:00 UTC;SameSite=Lax`;
}

interface CompactYearTermSwitcherProps {
  currentRole: string;
  userId: string; // For user-scoped academic context cookies
  academicYears: AcademicYearOption[];
}

/**
 * Compact year/term picker for the top header.
 * Only rendered for privileged roles; collapses into a single dropdown.
 * Intended to be visible when the sidebar is collapsed.
 */
export function CompactYearTermSwitcher({ currentRole, userId, academicYears: years }: CompactYearTermSwitcherProps) {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!schoolSlug || years.length === 0) {
      if (years.length === 0) setLoading(false);
      return;
    }

    const yearCookie = getCookie(`sms_working_year_${schoolSlug}_${userId}`);
    const termCookie = getCookie(`sms_working_term_${schoolSlug}_${userId}`);

    const activeYear =
      years.find((y) => y.id === yearCookie) ||
      years.find((y) => y.isCurrent) ||
      years[0];

    if (activeYear) {
      setSelectedYearId(activeYear.id);
      const activeTerm =
        activeYear.terms.find((t) => t.id === termCookie) ||
        activeYear.terms.find((t) => t.isCurrent) ||
        activeYear.terms[0];
      if (activeTerm) setSelectedTermId(activeTerm.id);
    }
    setLoading(false);
  }, [schoolSlug, userId, years]);

  const handleYearSelect = (yearId: string) => {
    if (yearId === selectedYearId) return;
    setSelectedYearId(yearId);
    setSelectedTermId(null);
    setSessionCookie(`sms_working_year_${schoolSlug}_${userId}`, yearId);
    clearCookie(`sms_working_term_${schoolSlug}_${userId}`);
    toast.success("Academic year changed");
    setOpen(false);
    setTimeout(() => window.location.reload(), 300);
  };

  const handleTermSelect = (termId: string) => {
    if (termId === selectedTermId) return;
    setSelectedTermId(termId);
    setSessionCookie(`sms_working_term_${schoolSlug}_${userId}`, termId);
    toast.success("Working term updated");
    setOpen(false);
    setTimeout(() => window.location.reload(), 300);
  };

  if (!PRIVILEGED_ROLES.includes(currentRole)) return null;

  const selectedYear = years.find((y) => y.id === selectedYearId);
  const selectedTerm = selectedYear?.terms.find((t) => t.id === selectedTermId);

  const label = selectedYear
    ? selectedTerm
      ? `${selectedYear.name} · ${selectedTerm.name}`
      : selectedYear.name
    : "Select context";

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs border-border/60 bg-background/80 hover:bg-accent max-w-[220px]"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Calendar className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          )}
          <span className="truncate">{loading ? "Loading..." : label}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        {years.map((year) => {
          const isYearSelected = year.id === selectedYearId;
          return (
            <React.Fragment key={year.id}>
              <DropdownMenuGroup>
                <DropdownMenuLabel className="flex items-center justify-between py-1.5">
                  <span className="font-semibold text-xs text-foreground">{year.name}</span>
                  <div className="flex items-center gap-1.5">
                    {year.isCurrent && (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                        Global
                      </Badge>
                    )}
                    {isYearSelected && !year.isCurrent && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-blue-400 text-blue-500">
                        Active
                      </Badge>
                    )}
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuItem
                  className={cn(
                    "text-xs pl-4 cursor-pointer",
                    isYearSelected && selectedTermId === null && "font-medium text-primary"
                  )}
                  onClick={() => handleYearSelect(year.id)}
                >
                  <Check className={cn("mr-2 h-3.5 w-3.5", isYearSelected ? "opacity-100 text-blue-500" : "opacity-0")} />
                  Select year only
                </DropdownMenuItem>

                {year.terms.map((term) => {
                  const isActive = isYearSelected && term.id === selectedTermId;
                  return (
                    <DropdownMenuItem
                      key={term.id}
                      className={cn(
                        "text-xs pl-8 cursor-pointer",
                        isActive && "font-medium text-primary"
                      )}
                      onClick={() => {
                        if (!isYearSelected) handleYearSelect(year.id);
                        handleTermSelect(term.id);
                      }}
                    >
                      <Check className={cn("mr-2 h-3.5 w-3.5 shrink-0", isActive ? "opacity-100 text-blue-500" : "opacity-0")} />
                      {term.name}
                    </DropdownMenuItem>
                  );
                })}

                {year.terms.length === 0 && (
                  <DropdownMenuItem disabled className="text-xs pl-8 text-muted-foreground italic">
                    No terms created
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
            </React.Fragment>
          );
        })}

        {years.length === 0 && !loading && (
          <DropdownMenuItem disabled className="text-xs text-muted-foreground text-center">
            No academic years found
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
