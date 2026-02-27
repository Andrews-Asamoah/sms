// app/(school)/[schoolSlug]/accountant/page.tsx
import { AnnouncementWidget } from "@/components/dashboard/announcement-widget";

export default function AccountantDashboard() {
  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight">
          Accountant Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage school finances, fees, and payments
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AnnouncementWidget />
        </div>
      </div>
    </div>
  );
}
