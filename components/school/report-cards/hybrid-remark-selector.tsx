"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, PenLine } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BehavioralRemark {
  pillar: "PUNCTUALITY" | "CONDUCT" | "ATTITUDE" | "OTHER";
  value: string;
}

interface PillarConfig {
  key: BehavioralRemark["pillar"];
  label: string;
  icon: string;
  options: string[];
}

interface HybridRemarkSelectorProps {
  value?: BehavioralRemark[];
  onChange: (remarks: BehavioralRemark[]) => void;
  disabled?: boolean;
  className?: string;
}

// ─── Pillar Definitions ───────────────────────────────────────────────────────

const PILLARS: PillarConfig[] = [
  {
    key: "PUNCTUALITY",
    label: "Punctuality",
    icon: "⏰",
    options: [
      "Always on time",
      "Usually on time",
      "Occasionally late",
      "Frequently late",
      "Needs significant improvement",
    ],
  },
  {
    key: "CONDUCT",
    label: "Conduct",
    icon: "🤝",
    options: [
      "Exemplary",
      "Very Good",
      "Satisfactory",
      "Needs Improvement",
      "Unsatisfactory",
    ],
  },
  {
    key: "ATTITUDE",
    label: "Attitude",
    icon: "⭐",
    options: [
      "Outstanding",
      "Enthusiastic",
      "Cooperative",
      "Passive",
      "Disruptive",
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function HybridRemarkSelector({
  value = [],
  onChange,
  disabled = false,
  className,
}: HybridRemarkSelectorProps) {
  const [customTexts, setCustomTexts] = useState<Record<string, string>>({});

  const getRemarkForPillar = (pillar: BehavioralRemark["pillar"]) =>
    value.find((r) => r.pillar === pillar);

  const updateRemark = (pillar: BehavioralRemark["pillar"], newValue: string) => {
    const updated = value.filter((r) => r.pillar !== pillar);
    if (newValue) {
      updated.push({ pillar, value: newValue });
    }
    onChange(updated);
  };

  const selectChip = (pillar: BehavioralRemark["pillar"], option: string) => {
    if (disabled) return;
    const current = getRemarkForPillar(pillar);
    // Toggle: clicking the same chip deselects it
    if (current?.value === option) {
      updateRemark(pillar, "");
    } else {
      // Clear any "Other" text if switching back to a predefined chip
      setCustomTexts((prev) => ({ ...prev, [pillar]: "" }));
      updateRemark(pillar, option);
    }
  };

  const handleOtherSelect = (pillar: BehavioralRemark["pillar"]) => {
    if (disabled) return;
    const existing = customTexts[pillar] || "";
    updateRemark(pillar, existing ? existing : " "); // trigger "OTHER" mode
    setCustomTexts((prev) => ({ ...prev, [pillar]: existing }));
  };

  const handleCustomTextChange = (
    pillar: BehavioralRemark["pillar"],
    text: string
  ) => {
    setCustomTexts((prev) => ({ ...prev, [pillar]: text }));
    updateRemark(pillar, text);
  };

  const isOtherMode = (pillar: BehavioralRemark["pillar"]) => {
    const remark = getRemarkForPillar(pillar);
    if (!remark) return false;
    return !PILLARS.find((p) => p.key === pillar)?.options.includes(remark.value);
  };

  return (
    <div className={cn("space-y-6", className)}>
      {PILLARS.map((pillar) => {
        const remark = getRemarkForPillar(pillar.key);
        const selectedValue = remark?.value;
        const inOtherMode = isOtherMode(pillar.key);

        return (
          <div key={pillar.key} className="space-y-3">
            {/* Pillar Header */}
            <div className="flex items-center gap-2">
              <span className="text-lg">{pillar.icon}</span>
              <h4 className="text-sm font-semibold">{pillar.label}</h4>
              {selectedValue && (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-auto" />
              )}
            </div>

            {/* Predefined Option Chips */}
            <div className="flex flex-wrap gap-2">
              {pillar.options.map((option) => {
                const isSelected = selectedValue === option && !inOtherMode;
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={disabled}
                    onClick={() => selectChip(pillar.key, option)}
                    className={cn(
                      "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border transition-all duration-150 cursor-pointer",
                      "hover:border-primary/60 hover:bg-primary/5",
                      isSelected
                        ? "bg-primary/10 border-primary text-primary font-semibold shadow-sm"
                        : "bg-muted/40 border-border text-muted-foreground",
                      disabled && "opacity-50 cursor-not-allowed pointer-events-none"
                    )}
                  >
                    {isSelected && <CheckCircle2 className="h-3 w-3 mr-1" />}
                    {option}
                  </button>
                );
              })}

              {/* "Other" Chip */}
              <button
                type="button"
                disabled={disabled}
                onClick={() => handleOtherSelect(pillar.key)}
                className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border transition-all duration-150 cursor-pointer gap-1",
                  "hover:border-amber-500/60 hover:bg-amber-500/5",
                  inOtherMode
                    ? "bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400 font-semibold shadow-sm"
                    : "bg-muted/40 border-border text-muted-foreground",
                  disabled && "opacity-50 cursor-not-allowed pointer-events-none"
                )}
              >
                <PenLine className="h-3 w-3" />
                Other
              </button>
            </div>

            {/* Custom Text Area (only visible in "Other" mode) */}
            {inOtherMode && (
              <Textarea
                placeholder={`Enter a custom remark for ${pillar.label.toLowerCase()}…`}
                value={customTexts[pillar.key] || ""}
                onChange={(e) => handleCustomTextChange(pillar.key, e.target.value)}
                disabled={disabled}
                className="min-h-[80px] text-sm bg-background resize-none border-amber-500/30 focus-visible:ring-amber-500/30"
              />
            )}

            {/* Selected Summary */}
            {selectedValue && (
              <p className="text-[11px] text-muted-foreground pl-1">
                Selected:{" "}
                <span className="font-medium text-foreground">
                  {inOtherMode ? `"${selectedValue}"` : selectedValue}
                </span>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
