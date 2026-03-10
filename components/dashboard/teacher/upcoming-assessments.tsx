"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  ClipboardList, 
  Users, 
  AlertCircle,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface Assessment {
  id: string;
  name: string;
  class: { name: string } | null;
  _count: {
    assessmentScores: number;
  };
  totalStudents: number; // We'll calculate or fetch this
}

export function UpcomingAssessments() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/schools/${schoolSlug}/teacher/assessments/active`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setAssessments(data);
    } catch (error) {
      console.error("Failed to fetch assessments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, [schoolSlug]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full shadow-2xl border-none bg-card/30 backdrop-blur-xl ring-1 ring-white/5 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
      <CardHeader className="flex flex-row items-center justify-between pb-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-emerald-500" />
            Grading
          </CardTitle>
          <CardDescription className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
            Progress Tracking
          </CardDescription>
        </div>
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Active</Badge>
      </CardHeader>
      <CardContent>
        {assessments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-3xl bg-white/5 border-white/5">
            <CheckCircle2 className="h-12 w-12 text-emerald-500/20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground italic">All assessments graded! Well done.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {assessments.map((assessment) => {
              const progress = Math.round((assessment._count.assessmentScores / (assessment.totalStudents || 1)) * 100);
              const isPending = progress < 100;
              
              return (
                <div key={assessment.id} className="group space-y-3 relative">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm tracking-tight group-hover:text-emerald-400 transition-colors uppercase">
                        {assessment.name}
                      </span>
                      <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-tighter">
                        {assessment.class?.name || "Multiple Classes"}
                      </span>
                    </div>
                    <div className="flex items-start flex-col items-end">
                      <span className={cn(
                        "text-lg font-black tracking-tighter leading-none",
                        isPending ? "text-amber-500" : "text-emerald-500"
                      )}>
                        {progress}%
                      </span>
                      <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/40 mt-1">Complete</span>
                    </div>
                  </div>
                  
                  <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden ring-1 ring-white/5">
                    <div 
                      className={cn(
                        "absolute top-0 left-0 h-full transition-all duration-1000 ease-out rounded-full",
                        progress === 100 ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "bg-gradient-to-r from-amber-500/80 to-amber-400"
                      )}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 text-[10px] font-bold text-muted-foreground/80">
                      <Users className="h-3 w-3 opacity-50" />
                      {assessment._count.assessmentScores} / {assessment.totalStudents}
                    </div>
                    {isPending ? (
                      <div className="flex items-center gap-1 text-[10px] font-black text-amber-500/80 uppercase tracking-tight">
                        <AlertCircle className="h-3 w-3" />
                        {assessment.totalStudents - assessment._count.assessmentScores} Pending
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[10px] font-black text-emerald-500/80 uppercase tracking-tight">
                        <CheckCircle2 className="h-3 w-3" />
                        Finalized
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
