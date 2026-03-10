"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  Loader2, 
  MapPin, 
  User, 
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Printer
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

export function TeacherTimetable() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay() === 0 ? "MONDAY" : DAYS[new Date().getDay() - 1]);

  const fetchTimetable = async () => {
    try {
      setLoading(true);
      // We'll use the existing timetable API with teacherId
      // We need to get the teacherId first (or use a special teacher-specific endpoint)
      const res = await fetch(`/api/schools/${schoolSlug}/teacher/timetable`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setEntries(data);
    } catch (error) {
      console.error("Failed to fetch timetable:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetable();
  }, [schoolSlug]);

  const filteredEntries = entries.filter(e => e.timeSlot.dayOfWeek === selectedDay);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
          {DAYS.map((day) => (
            <Button
              key={day}
              variant={selectedDay === day ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDay(day)}
              className="capitalize"
            >
              {day.toLowerCase()}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print Schedule
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredEntries.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3 border-dashed">
            <CardContent className="flex flex-col items-center justify-center h-48 py-12">
              <p className="text-muted-foreground italic">No classes scheduled for {selectedDay.toLowerCase()}.</p>
            </CardContent>
          </Card>
        ) : (
          filteredEntries.map((entry) => (
            <Card key={entry.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="secondary" className="text-[10px] font-bold">
                    {entry.timeSlot.startTime} - {entry.timeSlot.endTime}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 uppercase tracking-wider">
                    {entry.subject.code}
                  </Badge>
                </div>
                <CardTitle className="text-lg leading-tight">{entry.subject.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium text-primary">{entry.class?.name || "No Class"}</span>
                </div>
                {entry.classroom && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Room: {entry.classroom.name}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
