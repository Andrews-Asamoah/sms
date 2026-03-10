"use client";

import { ErrorView } from "@/components/layout/error-view";

export default function AccountantError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorView error={error} reset={reset} />;
}
