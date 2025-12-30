// ============================================
// NAV MAIN COMPONENT
// components/nav-main.tsx
// ============================================
'use client';
import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuSubButton,
  SidebarMenuSub,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from '@/components/ui/badge';
import { useSidebarContext } from '@/components/layout/sidebar-context';

export function NavMain({
  title,
  items,
  baseHref = '',
}: {
  title: string;
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    badge?: string;
    items?: {
      title: string;
      url: string;
      badge?: string;
    }[];
  }[];
  baseHref?: string;
}) {
  const pathname = usePathname();
  const { openItem, setOpenItem } = useSidebarContext();

  // Initialize openItem based on active state only once on mount
  React.useEffect(() => {
    const activeItem = items.find((item) => {
      const href = `${baseHref}${item.url}`;
      return pathname === href || 
        item.items?.some(subItem => pathname === `${baseHref}${subItem.url}`);
    });
    
    if (activeItem && activeItem.items && activeItem.items.length > 0) {
      setOpenItem(activeItem.title);
    }
    // Only run on mount and when pathname changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{title}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const href = `${baseHref}${item.url}`;
          const isActive = pathname === href || 
            item.items?.some(subItem => pathname === `${baseHref}${subItem.url}`);
          
          // If item has sub-items, render collapsible
          if (item.items && item.items.length > 0) {
            return (
              <Collapsible
                key={item.title}
                asChild
                open={openItem === item.title}
                onOpenChange={(open) => {
                  setOpenItem(open ? item.title : null);
                }}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={item.title}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto mr-2">
                          {item.badge}
                        </Badge>
                      )}
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items.map((subItem) => {
                        const subHref = `${baseHref}${subItem.url}`;
                        const isSubActive = pathname === subHref;
                        
                        return (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton asChild isActive={isSubActive}>
                              <Link href={subHref}>
                                <span>{subItem.title}</span>
                                {subItem.badge && (
                                  <Badge variant="secondary" className="ml-auto">
                                    {subItem.badge}
                                  </Badge>
                                )}
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            );
          }
          
          // If no sub-items, render simple link
          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                <Link href={href}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                  {item.badge && (
                    <Badge variant="secondary" className="ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}