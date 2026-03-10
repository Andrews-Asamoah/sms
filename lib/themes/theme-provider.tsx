"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useTheme as useNextTheme } from "next-themes";
import { ThemeName, themes } from "./colors";

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeName;
}

export function ThemeProvider({
  children,
  defaultTheme = "default",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeName>(defaultTheme);
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useNextTheme();

  useEffect(() => {
    setMounted(true);
    // Load theme from localStorage
    const savedTheme = localStorage.getItem("app-theme") as ThemeName;
    if (savedTheme && themes[savedTheme]) {
      setThemeState(savedTheme);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Apply theme to document
    document.documentElement.setAttribute("data-theme", theme);

    // Save to localStorage
    localStorage.setItem("app-theme", theme);

    // Apply CSS variables
    const root = document.documentElement;
    const isDark = root.classList.contains("dark");
    const themeColors = isDark ? themes[theme].dark : themes[theme].light;

    // Apply all theme colors as CSS variables
    root.style.setProperty("--theme-background", themeColors.background);
    root.style.setProperty("--theme-foreground", themeColors.foreground);
    root.style.setProperty("--theme-card", themeColors.card);
    root.style.setProperty("--theme-card-foreground", themeColors.cardForeground);
    root.style.setProperty("--theme-popover", themeColors.popover);
    root.style.setProperty(
      "--theme-popover-foreground",
      themeColors.popoverForeground,
    );
    root.style.setProperty("--theme-primary", themeColors.primary);
    root.style.setProperty(
      "--theme-primary-foreground",
      themeColors.primaryForeground,
    );
    root.style.setProperty("--theme-secondary", themeColors.secondary);
    root.style.setProperty(
      "--theme-secondary-foreground",
      themeColors.secondaryForeground,
    );
    root.style.setProperty("--theme-muted", themeColors.muted);
    root.style.setProperty("--theme-muted-foreground", themeColors.mutedForeground);
    root.style.setProperty("--theme-accent", themeColors.accent);
    root.style.setProperty("--theme-accent-foreground", themeColors.accentForeground);
    root.style.setProperty("--theme-destructive", themeColors.destructive);
    root.style.setProperty("--theme-border", themeColors.border);
    root.style.setProperty("--theme-input", themeColors.input);
    root.style.setProperty("--theme-ring", themeColors.ring);
    root.style.setProperty("--theme-sidebar", themeColors.sidebar);
    root.style.setProperty(
      "--theme-sidebar-foreground",
      themeColors.sidebarForeground,
    );
    root.style.setProperty("--theme-sidebar-primary", themeColors.sidebarPrimary);
    root.style.setProperty(
      "--theme-sidebar-primary-foreground",
      themeColors.sidebarPrimaryForeground,
    );
    root.style.setProperty("--theme-sidebar-accent", themeColors.sidebarAccent);
    root.style.setProperty(
      "--theme-sidebar-accent-foreground",
      themeColors.sidebarAccentForeground,
    );
    root.style.setProperty("--theme-sidebar-border", themeColors.sidebarBorder);
    root.style.setProperty("--theme-sidebar-ring", themeColors.sidebarRing);
  }, [theme, mounted, resolvedTheme]);

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme);
  };

  // Prevent flash of unstyled content
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
