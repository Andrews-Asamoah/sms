import React from "react";
import { Metadata } from "next";
import { DashboardPageHeader } from "@/components/layout/page-header";
import { TeacherTimetable } from "@/components/school/teacher/teacher-timetable";

export const metadata: Metadata = {
  title: "My Schedule",
  description: "View your weekly teaching schedule",
};

export default function TeacherSchedulePage() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <DashboardPageHeader
        title="My Schedule"
        description="Your weekly teaching timetable and class locations."
      />
      <div className="max-w-7xl mx-auto">
        <TeacherTimetable />
      </div>
    </div>
  );
}
