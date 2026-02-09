// app/(school)/[schoolSlug]/accountant/dashboard/page.tsx
export default function AccountantDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Accountant Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage school finances, fees, and payments
        </p>
      </div>
      {/* Add your accountant-specific dashboard content */}
    </div>
  );
}
