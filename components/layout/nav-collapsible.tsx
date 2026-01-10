// components/layout/nav-collapsible.tsx
"use client";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

interface NavCollapsibleProps {
  title?: string;
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
}

export default function NavCollapsible({ title, items }: NavCollapsibleProps) {
  const pathname = usePathname();
  const [openItem, setOpenItem] = useState<string | null>(null);

  const isUrlActive = useCallback(
    (url: string) => {
      if (pathname === url) return true;

      const allUrls = items.flatMap((item) =>
        item.items ? item.items.map((subItem) => subItem.url) : []
      );

      const isParentUrl = allUrls.some(
        (otherUrl) => otherUrl !== url && otherUrl.startsWith(url + "/")
      );

      if (isParentUrl) return false;

      return pathname.startsWith(url + "/");
    },
    [pathname, items]
  );

  const activeParentTitle = useMemo(() => {
    for (const item of items) {
      if (!item.items) continue;
      if (item.items.some((subItem) => isUrlActive(subItem.url))) {
        return item.title;
      }
    }
    return null;
  }, [items, isUrlActive]);

  useEffect(() => {
    setOpenItem(activeParentTitle);
  }, [activeParentTitle]);

  const handleToggle = (title: string) => {
    setOpenItem((prev) => (prev === title ? null : title));
  };

  return (
    <SidebarGroup>
      {title && <SidebarGroupLabel>{title}</SidebarGroupLabel>}
      <SidebarMenu>
        {items.map((item) => {
          const isParentActive = item.items?.some((subItem) =>
            isUrlActive(subItem.url)
          );
          const isOpen = openItem === item.title;

          if (item.items && item.items.length > 0) {
            return (
              <Collapsible
                key={item.title}
                open={isOpen}
                onOpenChange={() => handleToggle(item.title)}
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.title}
                      className={cn(
                        "w-full transition-colors",
                        isParentActive &&
                          "bg-sidebar-accent text-sidebar-accent-foreground"
                      )}
                    >
                      {item.icon && <item.icon className="h-4 w-4" />}
                      <span>{item.title}</span>
                      {item.badge && (
                        <Badge
                          variant="secondary"
                          className="ml-auto mr-2 h-5 px-1.5 text-xs"
                        >
                          {item.badge}
                        </Badge>
                      )}
                      <ChevronRight
                        className={cn(
                          "ml-auto h-4 w-4 transition-transform duration-200",
                          isOpen && "rotate-90"
                        )}
                      />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="transition-all duration-200 ease-in-out data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                    <SidebarMenuSub>
                      {item.items.map((subItem) => {
                        const isActive = isUrlActive(subItem.url);
                        return (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton
                              asChild
                              className={cn(
                                "w-full transition-colors",
                                isActive &&
                                  "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                              )}
                            >
                              <Link href={subItem.url}>
                                <span>{subItem.title}</span>
                                {subItem.badge && (
                                  <Badge
                                    variant="secondary"
                                    className="ml-auto h-5 px-1.5 text-xs"
                                  >
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

          const isActive = isUrlActive(item.url);
          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={isActive}
                tooltip={item.title}
                className="transition-colors"
              >
                <Link href={item.url}>
                  {item.icon && <item.icon className="h-4 w-4" />}
                  <span>{item.title}</span>
                  {item.badge && (
                    <Badge
                      variant="secondary"
                      className="ml-auto h-5 px-1.5 text-xs"
                    >
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
