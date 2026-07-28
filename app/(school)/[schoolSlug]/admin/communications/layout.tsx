// app/(school)/[schoolSlug]/admin/communications/layout.tsx
// Server Component — auth is handled by the parent admin layout.
// The sub-nav is extracted into a client component to use usePathname.
import { ReactNode } from "react";
import { CommunicationsSubNav } from "@/components/school/communications-sub-nav";

interface CommunicationsLayoutProps {
  children: ReactNode;
  params: Promise<{ schoolSlug: string }>;
}

export default async function CommunicationsLayout({
  children,
  params,
}: CommunicationsLayoutProps) {
  const { schoolSlug } = await params;

  return (
    <div className="space-y-6">
      {/* Shared header + tab navigation */}
      <CommunicationsSubNav schoolSlug={schoolSlug} />

      {/* Page content */}
      <div>{children}</div>
    </div>
  );
}
