"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  BookOpen, 
  Clock, 
  MapPin, 
  Loader2,
  CalendarDays
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TimetableEntry {
  id: string;
  subject: { name: string; code: string };
  class: { name: string } | null;
  timeSlot: {
    startTime: string;
    endTime: string;
    dayOfWeek: string;
  };
  classroom: { name: string } | null;
}

export function ClassesToday() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      // We'll fetch all teacher's classes and filter for today
      // In a real app, we'd probably have a specific endpoint for "today's classes"
      // or pass the teacherId. For now, let's assume we can fetch by teacher (we'll need an endpoint that knows the current user's teacherId)
      const res = await fetch(`/api/schools/${schoolSlug}/teacher/timetable/today`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setEntries(data);
    } catch (error) {
      console.error("Failed to fetch today's classes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [schoolSlug]);

  const currentDay = format(new Date(), "EEEE").toUpperCase();

  const isCurrentSlot = (startTime: string, endTime: string) => {
    const nowStr = format(currentTime, "HH:mm");
    return nowStr >= startTime && nowStr <= endTime;
  };

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
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
      <CardHeader className="flex flex-row items-center justify-between pb-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-blue-500" />
            Schedule
          </CardTitle>
          <CardDescription className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
            {format(new Date(), "EEEE, do MMMM")}
          </CardDescription>
        </div>
        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Today</Badge>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-3xl bg-white/5 border-white/5">
            <CalendarDays className="h-12 w-12 text-muted-foreground/20 mb-3" />
            <p className="text-sm font-medium text-muted-foreground italic">No classes scheduled for today.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => {
              const active = isCurrentSlot(entry.timeSlot.startTime, entry.timeSlot.endTime);
              return (
                <div 
                  key={entry.id} 
                  className={cn(
                    "group relative flex items-center gap-4 p-4 rounded-2xl border transition-all duration-500 overflow-hidden",
                    active 
                      ? "bg-blue-500/10 border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.1)] ring-1 ring-blue-500/20" 
                      : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
                  )}
                >
                  {/* Timeline Indicator */}
                  <div className={cn(
                    "flex flex-col items-center gap-1 min-w-[50px]",
                    active ? "text-blue-500" : "text-muted-foreground/60"
                  )}>
                    <span className="text-xs font-black tracking-tighter">{entry.timeSlot.startTime}</span>
                    <div className={cn("w-0.5 h-6 rounded-full", active ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" : "bg-white/10")} />
                    <span className="text-[10px] font-bold opacity-60">{entry.timeSlot.endTime}</span>
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn("font-bold tracking-tight", active ? "text-blue-100" : "text-foreground")}>
                          {entry.subject.name}
                        </span>
                        <Badge variant="secondary" className="text-[9px] h-4 px-1 border-none bg-white/10 text-muted-foreground">
                          {entry.subject.code}
                        </Badge>
                      </div>
                      {active && (
                        <div className="flex items-center gap-1.5">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                          </span>
                          <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Active</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="h-6 rounded-lg bg-indigo-500/5 border-indigo-500/20 text-indigo-400 text-[10px] font-bold">
                          {entry.class?.name || "Class"}
                        </Badge>
                        {entry.classroom && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80 font-medium">
                            <MapPin className="h-3 w-3" />
                            {entry.classroom.name}
                          </div>
                        )}
                      </div>
                      {!active && (
                        <Clock className="h-3 w-3 text-muted-foreground/40 group-hover:text-blue-400/60 transition-colors" />
                      )}
                    </div>
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
