// lib/breadcrumb-context.tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useMemo,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BreadcrumbContextState {
  /**
   * Map of pathname → custom label.
   * Pages render <DynamicBreadcrumb label="…" /> to register a label
   * for their own URL segment so the header can display it instead of
   * the raw slug/UUID.
   */
  labelMap: Record<string, string>;

  /** Register a dynamic label for a given pathname. */
  setLabel: (pathname: string, label: string) => void;

  /** Remove a previously registered label (called on unmount). */
  removeLabel: (pathname: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const BreadcrumbContext = createContext<BreadcrumbContextState>({
  labelMap: {},
  setLabel: () => {},
  removeLabel: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [labelMap, setLabelMap] = useState<Record<string, string>>({});

  const setLabel = useCallback((pathname: string, label: string) => {
    setLabelMap((prev) => {
      if (prev[pathname] === label) return prev; // no-op avoids re-render
      return { ...prev, [pathname]: label };
    });
  }, []);

  const removeLabel = useCallback((pathname: string) => {
    setLabelMap((prev) => {
      if (!(pathname in prev)) return prev;
      const next = { ...prev };
      delete next[pathname];
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ labelMap, setLabel, removeLabel }),
    [labelMap, setLabel, removeLabel],
  );

  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBreadcrumbContext() {
  return useContext(BreadcrumbContext);
}
