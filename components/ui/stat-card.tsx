import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconClassName?: string;
  className?: string;
  description?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  iconClassName,
  className,
  description,
}: StatCardProps) {
  return (
    <Card className={cn("backdrop-blur-sm bg-card/50 border-border/50", className)}>
      <CardHeader className="p-4 sm:p-6 flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs sm:text-sm font-medium">
          {title}
        </CardTitle>
        <Icon
          className={cn(
            "h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground",
            iconClassName
          )}
        />
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
        <div className="text-lg sm:text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
