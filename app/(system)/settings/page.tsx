import { requireSuperAdmin } from "@/lib/auth/session";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Settings, Mail, ShieldCheck, Globe } from "lucide-react";

export const metadata = {
  title: "System Settings | SuperAdmin Dashboard",
  description: "Global platform configuration",
};

export default async function SystemSettingsPage() {
  await requireSuperAdmin();

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground mt-2">
          Global platform configuration, email deliverability, and security
          constants.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* General Options */}
        <Card className="hover:shadow-lg transition-all group">
          <CardHeader>
            <div className="p-3 bg-primary/10 w-fit rounded-lg mb-4 group-hover:bg-primary/20 transition-colors">
              <Globe className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>General Config</CardTitle>
            <CardDescription>
              Regional settings, default currencies, and UI themes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Define the baseline settings inherited by new schools.
            </p>
          </CardContent>
        </Card>

        {/* Email & SMTP */}
        <Card className="hover:shadow-lg transition-all group">
          <CardHeader>
            <div className="p-3 bg-amber-500/10 w-fit rounded-lg mb-4 group-hover:bg-amber-500/20 transition-colors">
              <Mail className="h-6 w-6 text-amber-600" />
            </div>
            <CardTitle>Platform Email</CardTitle>
            <CardDescription>
              Resend API keys and domain verification statuses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              All transactional emails routing through standard providers.
            </p>
          </CardContent>
        </Card>

        {/* Security Defaults */}
        <Card className="hover:shadow-lg transition-all group">
          <CardHeader>
            <div className="p-3 bg-green-500/10 w-fit rounded-lg mb-4 group-hover:bg-green-500/20 transition-colors">
              <ShieldCheck className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>Security</CardTitle>
            <CardDescription>
              Password complexity policies and 2FA requirements.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Currently using basic standards. MFA enablement available.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
