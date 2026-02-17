"use client";

import { Check, Palette } from "lucide-react";
import { useTheme } from "@/lib/themes/theme-provider";
import { ThemeName, themeDisplayNames, themes } from "@/lib/themes/colors";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeSelector() {
  const { theme: currentTheme, setTheme } = useTheme();

  const themeOptions: ThemeName[] = [
    "default",
    "emerald",
    "blue",
    "purple",
    "orange",
    "rose",
  ];

  const getThemePreviewColor = (themeName: ThemeName) => {
    return themes[themeName].light.primary;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          <CardTitle>Color Theme</CardTitle>
        </div>
        <CardDescription>
          Choose a color theme for your dashboard. The theme will be applied
          across all pages.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {themeOptions.map((themeName) => {
            const isActive = currentTheme === themeName;
            const previewColor = getThemePreviewColor(themeName);

            return (
              <button
                key={themeName}
                onClick={() => setTheme(themeName)}
                className={cn(
                  "relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:border-primary/50",
                  isActive ? "border-primary bg-primary/5" : "border-border",
                )}
              >
                {isActive && (
                  <div className="absolute top-2 right-2">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                )}

                <div className="flex gap-1.5">
                  <div
                    className="h-8 w-8 rounded-full border shadow-sm"
                    style={{ backgroundColor: previewColor }}
                  />
                  <div
                    className="h-8 w-8 rounded-full border shadow-sm"
                    style={{ backgroundColor: themes[themeName].dark.primary }}
                  />
                </div>

                <span className="text-sm font-medium">
                  {themeDisplayNames[themeName]}
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
