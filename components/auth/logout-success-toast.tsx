// components/auth/logout-success-toast.tsx
"use client";
import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

export function LogoutSuccessToast() {
  const searchParams = useSearchParams();
  const hasShownToast = useRef(false);

  useEffect(() => {
    if (searchParams.get("from") === "logout" && !hasShownToast.current) {
      hasShownToast.current = true;

      toast.success("Logged out successfully", {
        duration: 4000,
      });

      // Clean up URL
      window.history.replaceState({}, "", "/login");
    }
  }, [searchParams]);

  return null;
}
