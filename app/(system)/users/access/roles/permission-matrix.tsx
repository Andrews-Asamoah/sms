"use client";

import { useCallback, useState, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PERMISSION_CATEGORIES } from "@/lib/auth/permissions";
import { ChevronDown, ChevronRight, CheckCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PermissionMatrixProps {
  value: Record<string, string[]>;
  onChange?: (permissions: Record<string, string[]>) => void;
  readonly?: boolean;
  compact?: boolean;
}

function cap(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PermissionMatrix({
  value,
  onChange,
  readonly = false,
  compact = false,
}: PermissionMatrixProps) {
  // All categories start expanded
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleCategory = useCallback((cat: string) => {
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }, []);

  const isChecked = useCallback(
    (resource: string, action: string) =>
      (value[resource] ?? []).includes(action),
    [value]
  );

  const toggle = useCallback(
    (resource: string, action: string) => {
      if (readonly || !onChange) return;
      const current = value[resource] ?? [];
      const next = current.includes(action)
        ? current.filter((a) => a !== action)
        : [...current, action];
      const newValue = { ...value };
      if (next.length === 0) {
        delete newValue[resource];
      } else {
        newValue[resource] = next;
      }
      onChange(newValue);
    },
    [readonly, onChange, value]
  );

  // selectAll=true → select all in category, false → clear all
  const selectAllInCategory = useCallback(
    (cat: keyof typeof PERMISSION_CATEGORIES, selectAll: boolean) => {
      if (readonly || !onChange) return;
      const resources = PERMISSION_CATEGORIES[cat];
      const newValue = { ...value };
      for (const [resource, actions] of Object.entries(resources)) {
        if (selectAll) {
          newValue[resource] = [...(actions as string[])];
        } else {
          delete newValue[resource];
        }
      }
      onChange(newValue);
    },
    [readonly, onChange, value]
  );

  const categoryCompletion = useMemo(() => {
    const result: Record<string, { checked: number; total: number }> = {};
    for (const [cat, resources] of Object.entries(PERMISSION_CATEGORIES)) {
      let total = 0;
      let checked = 0;
      for (const [resource, actions] of Object.entries(resources)) {
        const acts = actions as string[];
        total += acts.length;
        checked += acts.filter((a) =>
          (value[resource] ?? []).includes(a)
        ).length;
      }
      result[cat] = { total, checked };
    }
    return result;
  }, [value]);

  const { totalChecked, totalAll } = useMemo(() => {
    let totalChecked = 0;
    let totalAll = 0;
    for (const { checked, total } of Object.values(categoryCompletion)) {
      totalChecked += checked;
      totalAll += total;
    }
    return { totalChecked, totalAll };
  }, [categoryCompletion]);

  const selectAll = useCallback(() => {
    if (readonly || !onChange) return;
    const all: Record<string, string[]> = {};
    for (const resources of Object.values(PERMISSION_CATEGORIES)) {
      for (const [r, acts] of Object.entries(resources)) {
        all[r] = [...(acts as string[])];
      }
    }
    onChange(all);
  }, [readonly, onChange]);

  const clearAll = useCallback(() => {
    if (readonly || !onChange) return;
    onChange({});
  }, [readonly, onChange]);

  return (
    <div className="space-y-1">
      {/* Summary bar */}
      {!compact && (
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs text-muted-foreground">
            <span className="font-medium tabular-nums">{totalChecked}</span>
            {" / "}
            <span className="tabular-nums">{totalAll}</span>
            {" permissions enabled"}
          </span>
          {!readonly && onChange && (
            <div className="flex gap-1">
              <Button
                type="button"
                variant={totalChecked === totalAll && totalAll > 0 ? "default" : "outline"}
                size="sm"
                className="h-6 text-xs gap-1 px-2"
                onClick={selectAll}
              >
                <CheckCheck className="h-3 w-3" />
                Select All
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 text-xs gap-1 px-2"
                onClick={clearAll}
                disabled={totalChecked === 0}
              >
                <X className="h-3 w-3" />
                Clear All
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Categories */}
      {(
        Object.entries(PERMISSION_CATEGORIES) as [
          keyof typeof PERMISSION_CATEGORIES,
          Record<string, readonly string[]>
        ][]
      ).map(([cat, resources]) => {
        const isOpen = !collapsed[cat];
        const { checked, total } = categoryCompletion[cat] ?? {
          checked: 0,
          total: 0,
        };
        const allChecked = checked === total && total > 0;
        const someChecked = checked > 0 && checked < total;

        return (
          <div
            key={cat}
            className="border border-border rounded-lg overflow-hidden bg-card shadow-sm mb-3"
          >
            {/* Category header — split into two non-overlapping zones */}
            <div
              className={cn(
                "flex items-center justify-between px-3 py-2.5 transition-colors border-b border-transparent",
                "hover:bg-muted/60",
                isOpen ? "bg-muted/50 border-border" : "bg-card"
              )}
            >
              {/* Left: collapse toggle */}
              <button
                type="button"
                className="flex-1 flex items-center gap-2 text-left min-w-0"
                onClick={() => toggleCategory(cat)}
              >
                {isOpen ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
                <span className="text-sm font-medium truncate">{cat}</span>
                <Badge
                  variant={
                    allChecked
                      ? "default"
                      : someChecked
                      ? "secondary"
                      : "outline"
                  }
                  className="text-[10px] px-1.5 py-0 h-4 shrink-0"
                >
                  {checked}/{total}
                </Badge>
              </button>

              {/* Right: select/clear — completely separate from the toggle */}
              {!readonly && onChange && (
                <Button
                  type="button"
                  variant={allChecked ? "default" : "outline"}
                  size="sm"
                  className="h-6 text-[10px] px-2.5 py-0 ml-2 shrink-0 cursor-pointer transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    selectAllInCategory(cat, !allChecked);
                  }}
                >
                  {allChecked ? "Clear" : "Select All"}
                </Button>
              )}
            </div>

            {/* Resources list */}
            {isOpen && (
              <div className="divide-y divide-border/60 bg-background/50">
                {Object.entries(resources).map(([resource, actions]) => {
                  const acts = actions as string[];
                  const enabledCount = (value[resource] ?? []).length;
                  return (
                    <div
                      key={resource}
                      className="px-4 py-3 grid grid-cols-[110px_1fr] gap-3 items-start hover:bg-muted/30 transition-colors"
                    >
                      {/* Resource label */}
                      <div className="flex flex-col pt-0.5">
                        <span className="text-xs font-mono font-medium text-foreground/80 truncate">
                          {resource}
                        </span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          {enabledCount}/{acts.length}
                        </span>
                      </div>

                      {/* Action checkboxes */}
                      <div className="flex flex-wrap gap-x-3 gap-y-2 py-0.5">
                        {acts.map((action) => {
                          const checked = isChecked(resource, action);
                          return (
                            <label
                              key={action}
                              className={cn(
                                "flex items-center gap-1.5 group",
                                readonly
                                  ? "cursor-default"
                                  : "cursor-pointer"
                              )}
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() =>
                                  toggle(resource, action)
                                }
                                disabled={readonly}
                                className="h-3.5 w-3.5"
                              />
                              <span
                                className={cn(
                                  "text-xs select-none transition-colors",
                                  checked
                                    ? "text-foreground"
                                    : "text-muted-foreground",
                                  !readonly && "group-hover:text-foreground"
                                )}
                              >
                                {cap(action)}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
