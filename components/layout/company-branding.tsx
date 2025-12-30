// ============================================
// 1. COMPANY BRANDING COMPONENT (REPLACES SCHOOL SWITCHER)
// components/layout/company-branding.tsx
// ============================================
import Image from 'next/image';
import Link from 'next/link';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';

export function CompanyBranding({
  name,
  logo,
  tagline,
}: {
  name: string;
  logo?: string;
  tagline?: string;
}) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild className="cursor-pointer">
          <Link href="/dashboard">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 text-white">
              {logo ? (
                <Image
                  src={logo}
                  alt={name}
                  width={32}
                  height={32}
                  className="rounded-lg object-cover"
                  priority
                />
              ) : (
                <span className="font-bold text-lg">
                  {name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{name}</span>
              {tagline && (
                <span className="truncate text-xs text-muted-foreground">
                  {tagline}
                </span>
              )}
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
