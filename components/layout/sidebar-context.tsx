// ============================================
// SIDEBAR CONTEXT
// components/layout/sidebar-context.tsx
// ============================================
'use client';
import * as React from 'react';

interface SidebarContextType {
  openItem: string | null;
  setOpenItem: (item: string | null) => void;
}

const SidebarContext = React.createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [openItem, setOpenItem] = React.useState<string | null>(null);

  const value = React.useMemo(
    () => ({ openItem, setOpenItem }),
    [openItem]
  );

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebarContext() {
  const context = React.useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebarContext must be used within a SidebarProvider');
  }
  return context;
}