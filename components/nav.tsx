"use client";

import Link from "next/link";
import { IconType } from "react-icons";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { FaCaretDown } from "react-icons/fa6";

interface NavProps {
  isCollapsed: boolean;
  links: {
    title: string;
    label?: string;
    icon: IconType;
    variant: "default" | "ghost";
    href: string;
    submenu?: boolean;
    submenuItems?: { title: string; href: string }[];
  }[];
}

export function Nav({ links, isCollapsed }: NavProps) {
  const pathname = usePathname();
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

  const toggleSubmenu = (title: string) => {
    setOpenSubmenu(openSubmenu === title ? null : title);
  };

  const isActive = (link: any) => {
    // checks if the current pathname matches the link's href
    if (link.submenuItems) {
      return link.submenuItems.some(
        (subItem: any) => pathname === subItem.href
      );
    }
    return pathname === link.href;
  };

  const isParentActive = (link: any) => {
    // Check if the current pathname starts with the link's href and isn't exactly the same
    if (link.submenuItems) {
      return link.submenuItems.some(
        (subItem: any) =>
          pathname.startsWith(link.href) && pathname !== link.href
      );
    }
    return false;
  };

  return (
    <div
      data-collapsed={isCollapsed}
      className="group flex flex-col gap-4 py-2 data-[collapsed=true]:py-2"
    >
      <nav className="grid gap-1 px-2 group-[[data-collapsed=true]]:justify-center group-[[data-collapsed=true]]:px-2">
        {links.map((link, index) =>
          isCollapsed ? (
            <Tooltip key={index} delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  href={link.href}
                  className={cn(
                    buttonVariants({
                      variant:
                        isActive(link) || isParentActive(link)
                          ? "default"
                          : "ghost",
                      size: "icon",
                    }),
                    "h-9 w-9",
                    link.variant === "default" &&
                      "dark:bg-muted dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-white",
                    (isActive(link) || isParentActive(link)) &&
                      "active-link bg-primary",
                    isActive(link) || isParentActive(link)
                      ? "text-white"
                      : "text-gray-500"
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  <span className="sr-only text-base">{link.title}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="flex items-center gap-4 text-base"
              >
                {link.title}
                {link.label && (
                  <span className="ml-auto text-muted-foreground">
                    {link.label}
                  </span>
                )}
              </TooltipContent>
            </Tooltip>
          ) : link.submenu ? (
            <div key={index}>
              <Link
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  toggleSubmenu(link.title);
                }}
                className={cn(
                  buttonVariants({
                    variant:
                      isActive(link) || isParentActive(link)
                        ? "default"
                        : "ghost",
                    size: "sm",
                  }),
                  link.variant === "default" &&
                    "dark:bg-muted dark:text-white dark:hover:bg-muted dark:hover:text-white",
                  "justify-start text-base w-full flex items-center",
                  (isActive(link) || isParentActive(link)) &&
                    "active-link bg-primary",
                  isActive(link) || isParentActive(link)
                    ? "text-white"
                    : "text-gray-500"
                )}
              >
                <link.icon className="mr-2 h-4 w-4" />
                {link.title}
                <span
                  className={`ml-auto ${
                    openSubmenu === link.title ? "rotate-180" : ""
                  }`}
                >
                  <FaCaretDown />
                </span>
              </Link>
              {openSubmenu === link.title && (
                <div className="ml-4 mt-2 flex flex-col space-y-1 border-l-2 border-primary pl-2">
                  {link.submenuItems?.map((subItem, subIndex) => (
                    <Link
                      key={subIndex}
                      href={subItem.href}
                      className={`group px-3 py-1 w-full cursor-pointer transition hover:bg-gray-400/20 hover:text-black rounded-lg ${
                        subItem.href === pathname
                          ? "font-bold text-black dark:text-white"
                          : "text-zinc-500"
                      }`}
                    >
                      {subItem.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Link
              key={index}
              href={link.href}
              className={cn(
                buttonVariants({
                  variant: isActive(link) ? "default" : "ghost",
                  size: "sm",
                }),
                link.variant === "default" &&
                  "dark:bg-muted dark:text-white dark:hover:bg-muted dark:hover:text-white",
                "justify-start text-base",
                isActive(link) && "active-link",
                isActive(link) ? "text-white" : "text-gray-500"
              )}
            >
              <link.icon className="mr-2 h-4 w-4" />
              {link.title}
              {link.label && (
                <span
                  className={cn(
                    "ml-auto",
                    isActive(link) === "default" &&
                      "text-background dark:text-white"
                  )}
                >
                  {link.label}
                </span>
              )}
            </Link>
          )
        )}
      </nav>
    </div>
  );
}
