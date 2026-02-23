"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Term {
  id: string;
  name: string;
  isCurrent: boolean;
}

interface GradebookToolbarProps {
  schoolSlug: string;
  classId: string;
  subjects: Subject[];
  terms: Term[];
  selectedSubjectId?: string;
  selectedTermId?: string;
}

export function GradebookToolbar({
  subjects,
  terms,
  selectedSubjectId,
  selectedTermId,
}: GradebookToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Helper to update URL params
  const updateParams = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-end gap-4 bg-muted/30 p-4 rounded-lg border">
      <div className="grid w-full max-w-xs items-center gap-1.5">
        <Label htmlFor="subject" className="text-xs text-muted-foreground">
          Subject
        </Label>
        <Select
          value={selectedSubjectId}
          onValueChange={(val) => updateParams("subjectId", val)}
        >
          <SelectTrigger id="subject" className="w-[200px] h-9 bg-background">
            <SelectValue placeholder="Select subject" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name} ({s.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid w-full max-w-xs items-center gap-1.5">
        <Label htmlFor="term" className="text-xs text-muted-foreground">
          Academic Term
        </Label>
        <Select
          value={selectedTermId}
          onValueChange={(val) => updateParams("termId", val)}
        >
          <SelectTrigger id="term" className="w-[180px] h-9 bg-background">
            <SelectValue placeholder="Select term" />
          </SelectTrigger>
          <SelectContent>
            {terms.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name} {t.isCurrent && "(Current)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
