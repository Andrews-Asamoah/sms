"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Sparkles, Plus, Trash2, Copy, CheckCircle2, Loader2, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface AINarrativeGeneratorProps {
  schoolSlug: string;
  studentName: string;
  academicSummary?: string;
  onApply: (narrative: string) => void;
  className?: string;
}

export function AINarrativeGenerator({
  schoolSlug,
  studentName,
  academicSummary,
  onApply,
  className,
}: AINarrativeGeneratorProps) {
  const [bulletPoints, setBulletPoints] = useState<string[]>(["", ""]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedNarrative, setGeneratedNarrative] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const handleAddBullet = () => {
    setBulletPoints((prev) => [...prev, ""]);
  };

  const handleRemoveBullet = (index: number) => {
    if (bulletPoints.length <= 1) return;
    setBulletPoints((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBulletChange = (index: number, value: string) => {
    setBulletPoints((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleGenerate = async () => {
    const validPoints = bulletPoints.filter((bp) => bp.trim().length > 0);
    
    if (validPoints.length === 0) {
      toast.error("Please add at least one observation point.");
      return;
    }

    setIsGenerating(true);
    setGeneratedNarrative(null);
    setIsCopied(false);

    try {
      const response = await fetch(`/api/schools/${schoolSlug}/report-cards/ai-narrative`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName,
          bulletPoints: validPoints,
          academicSummary,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate narrative");
      }

      setGeneratedNarrative(data.narrative);
      toast.success("AI Narrative generated successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedNarrative) return;
    navigator.clipboard.writeText(generatedNarrative);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    toast.success("Copied to clipboard");
  };

  return (
    <div className={cn("space-y-6 p-5 border rounded-xl bg-card shadow-sm", className)}>
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold">AI Remark Synthesizer</h3>
          <p className="text-xs text-muted-foreground">
            Enter short bullet points; Gemini will write a cohesive professional remark.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-3">
          <label className="text-sm font-medium">Observational Points for {studentName}</label>
          {bulletPoints.map((bp, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-4 text-center">{index + 1}.</span>
              <Input
                placeholder="e.g. Excellent participation in class discussions"
                value={bp}
                onChange={(e) => handleBulletChange(index, e.target.value)}
                className="flex-1 h-9 text-sm"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveBullet(index)}
                disabled={bulletPoints.length <= 1 || isGenerating}
                className="h-9 w-9 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAddBullet}
            disabled={isGenerating}
            className="text-xs text-primary mt-1"
          >
            <Plus className="h-3 w-3 mr-1" /> Add Point
          </Button>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md transition-all"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Synthesizing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Professional Remark
            </>
          )}
        </Button>

        {generatedNarrative && (
          <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="relative border rounded-lg overflow-hidden bg-primary/5 p-4">
              <div className="absolute top-2 right-2 flex gap-1">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopy}
                  className="h-7 cursor-pointer hover:bg-white"
                  title="Copy to clipboard"
                >
                  {isCopied ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
              <p className="text-sm leading-relaxed text-foreground pr-10">
                {generatedNarrative}
              </p>
            </div>
            <div className="flex justify-end mt-3">
              <Button
                onClick={() => onApply(generatedNarrative)}
                className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="h-3 w-3 mr-1" /> Use this Remark
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
