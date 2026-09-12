// components/layout/role-switcher.tsx
"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  Shield,
  User,
  GraduationCap,
  Users,
  DollarSign,
  UserCog,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface RoleSwitcherProps {
  schoolSlug: string;
  currentRole: string;
  availableRoles: string[];
  className?: string;
}

const roleConfig = {
  superAdmin: {
    label: "Super Admin",
    icon: Shield,
    color: "text-purple-600",
    badge: "purple",
    route: "admin",
  },
  owner: {
    label: "School Owner",
    icon: Shield,
    color: "text-purple-600",
    badge: "purple",
    route: "admin",
  },
  admin: {
    label: "Admin",
    icon: Shield,
    color: "text-blue-600",
    badge: "blue",
    route: "admin",
  },
  headteacher: {
    label: "Head Teacher",
    icon: Shield,
    color: "text-orange-600",
    badge: "orange",
    route: "admin",
  },
  teacher: {
    label: "Teacher",
    icon: GraduationCap,
    color: "text-green-600",
    badge: "green",
    route: "teacher",
  },
  accountant: {
    label: "Accountant",
    icon: DollarSign,
    color: "text-amber-600",
    badge: "amber",
    route: "accountant",
  },
  student: {
    label: "Student",
    icon: User,
    color: "text-indigo-600",
    badge: "indigo",
    route: "student",
  },
  guardian: {
    label: "Parent/Guardian",
    icon: Users,
    color: "text-pink-600",
    badge: "pink",
    route: "guardian",
  },
  member: {
    label: "Member",
    icon: User,
    color: "text-gray-600",
    badge: "gray",
    route: "teacher", // no /member/ folder — member users see teacher dashboard
  },
} as const;

export function RoleSwitcher({
  schoolSlug,
  currentRole,
  availableRoles,
  className,
}: RoleSwitcherProps) {
  const router = useRouter();
  const currentConfig =
    roleConfig[currentRole as keyof typeof roleConfig] || roleConfig.member;
  const CurrentIcon = currentConfig.icon;
  const hasMultipleRoles = availableRoles.length > 1;

  const handleRoleSwitch = (role: string) => {
    const config = roleConfig[role as keyof typeof roleConfig];
    if (!config) return;

    // Set the active role cookie to persist the choice
    document.cookie = `sms_active_role_${schoolSlug}=${role}; path=/; max-age=31536000; SameSite=Lax`;

    // Navigate to the appropriate dashboard and force a refresh of the server-side layout
    router.push(`/${schoolSlug}/${config.route}`);
    router.refresh();
  };

  const SwitcherButton = (
    <Button
      variant="outline"
      className={cn(
        "flex items-center gap-2 h-9 px-3",
        !hasMultipleRoles &&
          "cursor-default hover:bg-background shadow-none border-dashed",
        className,
      )}
    >
      <CurrentIcon className={cn("h-4 w-4", currentConfig.color)} />
      <span className="hidden xl:inline-block">{currentConfig.label}</span>
      {hasMultipleRoles && <ChevronDown className="h-4 w-4 opacity-50" />}
    </Button>
  );

  if (!hasMultipleRoles) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{SwitcherButton}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Switch Role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableRoles.map((role) => {
          const config =
            roleConfig[role as keyof typeof roleConfig] || roleConfig.member;
          const RoleIcon = config.icon;
          const isActive = role === currentRole;

          return (
            <DropdownMenuItem
              key={role}
              className={cn("cursor-pointer", isActive && "bg-accent")}
              onClick={() => handleRoleSwitch(role)}
            >
              <RoleIcon className={cn("mr-2 h-4 w-4", config.color)} />
              <span className="flex-1">{config.label}</span>
              {isActive && (
                <Badge variant="secondary" className="ml-auto">
                  Active
                </Badge>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
