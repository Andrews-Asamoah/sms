"use client";

import { useState } from "react";
import { Plus, Trash2, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TimeSlot {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  label: string | null;
}

export function TimeSlotManager({
  schoolSlug,
  onRefresh,
}: {
  schoolSlug: string;
  onRefresh?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);

  // Form State
  const [day, setDay] = useState("MONDAY");
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("09:00");
  const [label, setLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const days = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
  ];

  const fetchSlots = async () => {
    try {
      setLoadingSlots(true);
      const res = await fetch(`/api/schools/${schoolSlug}/timetable/slots`);
      if (res.ok) {
        setSlots(await res.json());
      }
    } catch (error) {
      toast.error("Failed to fetch slots");
    } finally {
      setLoadingSlots(false);
    }
  };

  useState(() => {
    fetchSlots();
  });

  const handleSave = async () => {
    if (!start || !end) return toast.error("Times are required");

    try {
      setLoading(true);
      const url = editingId 
        ? `/api/schools/${schoolSlug}/timetable/slots/${editingId}`
        : `/api/schools/${schoolSlug}/timetable/slots`;
      
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dayOfWeek: day,
          startTime: start,
          endTime: end,
          label,
        }),
      });

      if (res.ok) {
        toast.success(editingId ? "Slot updated" : "Time slot added");
        setEditingId(null);
        setLabel("");
        fetchSlots();
        if (onRefresh) onRefresh();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to save slot");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will delete all timetable entries using this slot.")) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/schools/${schoolSlug}/timetable/slots/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Slot deleted");
        fetchSlots();
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      toast.error("Failed to delete slot");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (slot: TimeSlot) => {
    setEditingId(slot.id);
    setDay(slot.dayOfWeek);
    setStart(slot.startTime);
    setEnd(slot.endTime);
    setLabel(slot.label || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="py-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            {editingId ? "Edit Time Slot" : "Add Time Slot"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground mr-1">Day</label>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {days.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground mr-1">Start</label>
              <Input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground mr-1">End</label>
              <Input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground mr-1">Label</label>
              <Input
                placeholder="e.g. Period 1"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={loading} className="flex-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? "Update" : "Add"}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={() => {
                  setEditingId(null);
                  setLabel("");
                }}>Cancel</Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Existing Time Slots</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-32">Day</TableHead>
                  <TableHead>Time Range</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingSlots ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : slots.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">
                      No slots defined yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  slots.map((slot) => (
                    <TableRow key={slot.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-bold text-xs uppercase letter-spacing-wide">
                        {slot.dayOfWeek}
                      </TableCell>
                      <TableCell className="font-medium">
                        {slot.startTime} — {slot.endTime}
                      </TableCell>
                      <TableCell>
                        {slot.label ? (
                          <Badge variant="secondary" className="font-semibold">{slot.label}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">No label</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-primary hover:bg-primary/10"
                            onClick={() => startEdit(slot)}
                          >
                            <Clock className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(slot.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
