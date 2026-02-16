import { ThemeSelector } from "@/components/theme-selector";
import { ModeToggle } from "@/components/mode-toggle";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      <Separator />

      <div className="space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-4">Appearance</h2>
          <div className="space-y-4">
            <ThemeSelector />

            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <h3 className="font-medium">Dark Mode</h3>
                <p className="text-sm text-muted-foreground">
                  Toggle between light and dark mode
                </p>
              </div>
              <ModeToggle />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
