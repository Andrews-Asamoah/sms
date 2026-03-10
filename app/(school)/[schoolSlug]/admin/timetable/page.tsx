import React from "react";
import { TimetableClient } from "./timetable-client";
import { requireSchoolAccess } from "@/lib/auth/guards";

export default async function TimetablePage({
  params,
}: {
  params: Promise<{ schoolSlug: string }>;
}) {
  const { schoolSlug } = await params;
  await requireSchoolAccess(schoolSlug);

  return (
    <div className="p-6">
      <TimetableClient />
    </div>
  );
}
