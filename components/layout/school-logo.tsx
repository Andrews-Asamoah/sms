// components/layout/school-logo.tsx - FIXED
"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface SchoolLogoProps {
  name: string;
  logo?: string;
  plan?: string;
  href: string;
}

export default function SchoolLogo({
  name,
  logo,
  plan,
  href,
}: SchoolLogoProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 transition-all hover:bg-accent/50 rounded-lg",
        "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2",
      )}
    >
      {logo && (
        <div className="shrink-0">
          <Image
            src={logo}
            alt={`${name} logo`}
            width={32}
            height={32}
            className="rounded-md"
          />
        </div>
      )}
      <div className="flex flex-col min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
        <span className="font-semibold text-sm truncate">{name}</span>
        {plan && (
          <span className="text-xs text-muted-foreground truncate">{plan}</span>
        )}
      </div>
    </Link>
  );
}
