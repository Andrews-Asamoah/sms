"use client";

import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
interface LogoProps {
  isCollapsed: boolean;
  links: {
    title: string;
    triggerTxt: string;
    label?: string;
    variant: "default" | "ghost";
    href: string;
  }[];
}

const Logo = ({ links, isCollapsed }: LogoProps) => {
  const pathname = usePathname();

  return (
    <div
      data-collapsed={isCollapsed}
      className="group flex flex-col gap-4 data-[collapsed=true]:py-2">
      <nav className="grid gap-1 px-2 group-[[data-collapsed=true]]:justify-center group-[[data-collapsed=true]]:px-2">
        {links.map((link, index) =>
          isCollapsed ? (
            <Tooltip key={index} delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  href={link.href}
                  className={cn(
                    buttonVariants({
                      variant: "default",
                      size: "icon",
                    }),
                    link.variant === "default" &&
                      "dark:bg-primary dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-white"
                  )}>
                  <div className="relative h-6 w-5 ">
                    <Image alt="logo" src="/wis-logo.png" fill />
                  </div>
                  <span className="sr-only">{link.title}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="flex items-center gap-4">
                {link.triggerTxt}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Link
              key={index}
              href={link.href}
              className={cn(
                buttonVariants({
                  variant: "default",
                  size: "sm",
                  className: "uppercase font-semibold",
                }),
                "py-8 px-2 uppercase font-bold",
                link.variant === "default" &&
                  "dark:bg-primary dark:text-white dark:hover:bg-muted dark:hover:text-white",
                "justify-start"
              )}>
              <div className="relative mr-2 h-7 w-6 ">
                <Image className="" alt="logo" src="/wis-logo.png" fill />
              </div>
              {link.title}
            </Link>
          )
        )}
      </nav>
    </div>
  );
};

export default Logo;