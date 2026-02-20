"use client";

import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button
      onClick={() => signOut()}
      variant="outline"
      className="w-full bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm"
      size="lg"
    >
      Sign Out
    </Button>
  );
}
