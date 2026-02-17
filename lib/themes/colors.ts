/**
 * Theme Color Definitions
 *
 * Each theme contains a complete set of color variables for both light and dark modes.
 * Colors are defined using OKLCH color space for better perceptual uniformity.
 */

export type ThemeName =
  | "default"
  | "emerald"
  | "blue"
  | "purple"
  | "orange"
  | "rose";

export interface ThemeColors {
  light: {
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    popover: string;
    popoverForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    destructive: string;
    border: string;
    input: string;
    ring: string;
    // Sidebar colors
    sidebar: string;
    sidebarForeground: string;
    sidebarPrimary: string;
    sidebarPrimaryForeground: string;
    sidebarAccent: string;
    sidebarAccentForeground: string;
    sidebarBorder: string;
    sidebarRing: string;
  };
  dark: {
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    popover: string;
    popoverForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    destructive: string;
    border: string;
    input: string;
    ring: string;
    // Sidebar colors
    sidebar: string;
    sidebarForeground: string;
    sidebarPrimary: string;
    sidebarPrimaryForeground: string;
    sidebarAccent: string;
    sidebarAccentForeground: string;
    sidebarBorder: string;
    sidebarRing: string;
  };
}

export const themes: Record<ThemeName, ThemeColors> = {
  default: {
    light: {
      background: "oklch(1 0 0)",
      foreground: "oklch(0.145 0 0)",
      card: "oklch(1 0 0)",
      cardForeground: "oklch(0.145 0 0)",
      popover: "oklch(1 0 0)",
      popoverForeground: "oklch(0.145 0 0)",
      primary: "oklch(0.205 0 0)",
      primaryForeground: "oklch(0.985 0 0)",
      secondary: "oklch(0.97 0 0)",
      secondaryForeground: "oklch(0.205 0 0)",
      muted: "oklch(0.97 0 0)",
      mutedForeground: "oklch(0.556 0 0)",
      accent: "oklch(0.97 0 0)",
      accentForeground: "oklch(0.205 0 0)",
      destructive: "oklch(0.577 0.245 27.325)",
      border: "oklch(0.922 0 0)",
      input: "oklch(0.922 0 0)",
      ring: "oklch(0.708 0 0)",
      sidebar: "oklch(0.985 0 0)",
      sidebarForeground: "oklch(0.145 0 0)",
      sidebarPrimary: "oklch(0.205 0 0)",
      sidebarPrimaryForeground: "oklch(0.985 0 0)",
      sidebarAccent: "oklch(0.97 0 0)",
      sidebarAccentForeground: "oklch(0.205 0 0)",
      sidebarBorder: "oklch(0.922 0 0)",
      sidebarRing: "oklch(0.708 0 0)",
    },
    dark: {
      background: "oklch(0.145 0 0)",
      foreground: "oklch(0.985 0 0)",
      card: "oklch(0.205 0 0)",
      cardForeground: "oklch(0.985 0 0)",
      popover: "oklch(0.205 0 0)",
      popoverForeground: "oklch(0.985 0 0)",
      primary: "oklch(0.922 0 0)",
      primaryForeground: "oklch(0.205 0 0)",
      secondary: "oklch(0.269 0 0)",
      secondaryForeground: "oklch(0.985 0 0)",
      muted: "oklch(0.269 0 0)",
      mutedForeground: "oklch(0.708 0 0)",
      accent: "oklch(0.269 0 0)",
      accentForeground: "oklch(0.985 0 0)",
      destructive: "oklch(0.704 0.191 22.216)",
      border: "oklch(1 0 0 / 10%)",
      input: "oklch(1 0 0 / 15%)",
      ring: "oklch(0.556 0 0)",
      sidebar: "oklch(0.205 0 0)",
      sidebarForeground: "oklch(0.985 0 0)",
      sidebarPrimary: "oklch(0.488 0.243 264.376)",
      sidebarPrimaryForeground: "oklch(0.985 0 0)",
      sidebarAccent: "oklch(0.269 0 0)",
      sidebarAccentForeground: "oklch(0.985 0 0)",
      sidebarBorder: "oklch(1 0 0 / 10%)",
      sidebarRing: "oklch(0.556 0 0)",
    },
  },

  emerald: {
    light: {
      background: "oklch(0.99 0 0)",
      foreground: "oklch(0.15 0.01 166)",
      card: "oklch(1 0 0)",
      cardForeground: "oklch(0.15 0.01 166)",
      popover: "oklch(1 0 0)",
      popoverForeground: "oklch(0.15 0.01 166)",
      primary: "oklch(0.55 0.15 166)", // Emerald
      primaryForeground: "oklch(0.99 0 0)",
      secondary: "oklch(0.96 0.01 166)",
      secondaryForeground: "oklch(0.25 0.02 166)",
      muted: "oklch(0.96 0.01 166)",
      mutedForeground: "oklch(0.50 0.01 166)",
      accent: "oklch(0.94 0.02 166)",
      accentForeground: "oklch(0.25 0.02 166)",
      destructive: "oklch(0.577 0.245 27.325)",
      border: "oklch(0.90 0.01 166)",
      input: "oklch(0.90 0.01 166)",
      ring: "oklch(0.55 0.15 166)",
      sidebar: "oklch(0.98 0.005 166)",
      sidebarForeground: "oklch(0.20 0.01 166)",
      sidebarPrimary: "oklch(0.55 0.15 166)",
      sidebarPrimaryForeground: "oklch(0.99 0 0)",
      sidebarAccent: "oklch(0.94 0.02 166)",
      sidebarAccentForeground: "oklch(0.25 0.02 166)",
      sidebarBorder: "oklch(0.90 0.01 166)",
      sidebarRing: "oklch(0.55 0.15 166)",
    },
    dark: {
      background: "oklch(0.13 0.01 166)",
      foreground: "oklch(0.98 0.005 166)",
      card: "oklch(0.18 0.01 166)",
      cardForeground: "oklch(0.98 0.005 166)",
      popover: "oklch(0.18 0.01 166)",
      popoverForeground: "oklch(0.98 0.005 166)",
      primary: "oklch(0.65 0.17 166)", // Brighter emerald for dark mode
      primaryForeground: "oklch(0.13 0.01 166)",
      secondary: "oklch(0.24 0.015 166)",
      secondaryForeground: "oklch(0.98 0.005 166)",
      muted: "oklch(0.24 0.015 166)",
      mutedForeground: "oklch(0.70 0.01 166)",
      accent: "oklch(0.28 0.02 166)",
      accentForeground: "oklch(0.98 0.005 166)",
      destructive: "oklch(0.704 0.191 22.216)",
      border: "oklch(1 0 0 / 10%)",
      input: "oklch(1 0 0 / 15%)",
      ring: "oklch(0.65 0.17 166)",
      sidebar: "oklch(0.16 0.01 166)",
      sidebarForeground: "oklch(0.98 0.005 166)",
      sidebarPrimary: "oklch(0.65 0.17 166)",
      sidebarPrimaryForeground: "oklch(0.13 0.01 166)",
      sidebarAccent: "oklch(0.24 0.015 166)",
      sidebarAccentForeground: "oklch(0.98 0.005 166)",
      sidebarBorder: "oklch(1 0 0 / 10%)",
      sidebarRing: "oklch(0.65 0.17 166)",
    },
  },

  blue: {
    light: {
      background: "oklch(0.99 0 0)",
      foreground: "oklch(0.15 0.01 250)",
      card: "oklch(1 0 0)",
      cardForeground: "oklch(0.15 0.01 250)",
      popover: "oklch(1 0 0)",
      popoverForeground: "oklch(0.15 0.01 250)",
      primary: "oklch(0.50 0.20 250)", // Blue
      primaryForeground: "oklch(0.99 0 0)",
      secondary: "oklch(0.96 0.01 250)",
      secondaryForeground: "oklch(0.25 0.02 250)",
      muted: "oklch(0.96 0.01 250)",
      mutedForeground: "oklch(0.50 0.01 250)",
      accent: "oklch(0.94 0.02 250)",
      accentForeground: "oklch(0.25 0.02 250)",
      destructive: "oklch(0.577 0.245 27.325)",
      border: "oklch(0.90 0.01 250)",
      input: "oklch(0.90 0.01 250)",
      ring: "oklch(0.50 0.20 250)",
      sidebar: "oklch(0.98 0.005 250)",
      sidebarForeground: "oklch(0.20 0.01 250)",
      sidebarPrimary: "oklch(0.50 0.20 250)",
      sidebarPrimaryForeground: "oklch(0.99 0 0)",
      sidebarAccent: "oklch(0.94 0.02 250)",
      sidebarAccentForeground: "oklch(0.25 0.02 250)",
      sidebarBorder: "oklch(0.90 0.01 250)",
      sidebarRing: "oklch(0.50 0.20 250)",
    },
    dark: {
      background: "oklch(0.13 0.01 250)",
      foreground: "oklch(0.98 0.005 250)",
      card: "oklch(0.18 0.01 250)",
      cardForeground: "oklch(0.98 0.005 250)",
      popover: "oklch(0.18 0.01 250)",
      popoverForeground: "oklch(0.98 0.005 250)",
      primary: "oklch(0.60 0.22 250)",
      primaryForeground: "oklch(0.13 0.01 250)",
      secondary: "oklch(0.24 0.015 250)",
      secondaryForeground: "oklch(0.98 0.005 250)",
      muted: "oklch(0.24 0.015 250)",
      mutedForeground: "oklch(0.70 0.01 250)",
      accent: "oklch(0.28 0.02 250)",
      accentForeground: "oklch(0.98 0.005 250)",
      destructive: "oklch(0.704 0.191 22.216)",
      border: "oklch(1 0 0 / 10%)",
      input: "oklch(1 0 0 / 15%)",
      ring: "oklch(0.60 0.22 250)",
      sidebar: "oklch(0.16 0.01 250)",
      sidebarForeground: "oklch(0.98 0.005 250)",
      sidebarPrimary: "oklch(0.60 0.22 250)",
      sidebarPrimaryForeground: "oklch(0.13 0.01 250)",
      sidebarAccent: "oklch(0.24 0.015 250)",
      sidebarAccentForeground: "oklch(0.98 0.005 250)",
      sidebarBorder: "oklch(1 0 0 / 10%)",
      sidebarRing: "oklch(0.60 0.22 250)",
    },
  },

  purple: {
    light: {
      background: "oklch(0.99 0 0)",
      foreground: "oklch(0.15 0.01 290)",
      card: "oklch(1 0 0)",
      cardForeground: "oklch(0.15 0.01 290)",
      popover: "oklch(1 0 0)",
      popoverForeground: "oklch(0.15 0.01 290)",
      primary: "oklch(0.52 0.22 290)", // Purple
      primaryForeground: "oklch(0.99 0 0)",
      secondary: "oklch(0.96 0.01 290)",
      secondaryForeground: "oklch(0.25 0.02 290)",
      muted: "oklch(0.96 0.01 290)",
      mutedForeground: "oklch(0.50 0.01 290)",
      accent: "oklch(0.94 0.02 290)",
      accentForeground: "oklch(0.25 0.02 290)",
      destructive: "oklch(0.577 0.245 27.325)",
      border: "oklch(0.90 0.01 290)",
      input: "oklch(0.90 0.01 290)",
      ring: "oklch(0.52 0.22 290)",
      sidebar: "oklch(0.98 0.005 290)",
      sidebarForeground: "oklch(0.20 0.01 290)",
      sidebarPrimary: "oklch(0.52 0.22 290)",
      sidebarPrimaryForeground: "oklch(0.99 0 0)",
      sidebarAccent: "oklch(0.94 0.02 290)",
      sidebarAccentForeground: "oklch(0.25 0.02 290)",
      sidebarBorder: "oklch(0.90 0.01 290)",
      sidebarRing: "oklch(0.52 0.22 290)",
    },
    dark: {
      background: "oklch(0.13 0.01 290)",
      foreground: "oklch(0.98 0.005 290)",
      card: "oklch(0.18 0.01 290)",
      cardForeground: "oklch(0.98 0.005 290)",
      popover: "oklch(0.18 0.01 290)",
      popoverForeground: "oklch(0.98 0.005 290)",
      primary: "oklch(0.65 0.24 290)",
      primaryForeground: "oklch(0.13 0.01 290)",
      secondary: "oklch(0.24 0.015 290)",
      secondaryForeground: "oklch(0.98 0.005 290)",
      muted: "oklch(0.24 0.015 290)",
      mutedForeground: "oklch(0.70 0.01 290)",
      accent: "oklch(0.28 0.02 290)",
      accentForeground: "oklch(0.98 0.005 290)",
      destructive: "oklch(0.704 0.191 22.216)",
      border: "oklch(1 0 0 / 10%)",
      input: "oklch(1 0 0 / 15%)",
      ring: "oklch(0.65 0.24 290)",
      sidebar: "oklch(0.16 0.01 290)",
      sidebarForeground: "oklch(0.98 0.005 290)",
      sidebarPrimary: "oklch(0.65 0.24 290)",
      sidebarPrimaryForeground: "oklch(0.13 0.01 290)",
      sidebarAccent: "oklch(0.24 0.015 290)",
      sidebarAccentForeground: "oklch(0.98 0.005 290)",
      sidebarBorder: "oklch(1 0 0 / 10%)",
      sidebarRing: "oklch(0.65 0.24 290)",
    },
  },

  orange: {
    light: {
      background: "oklch(0.99 0 0)",
      foreground: "oklch(0.15 0.01 40)",
      card: "oklch(1 0 0)",
      cardForeground: "oklch(0.15 0.01 40)",
      popover: "oklch(1 0 0)",
      popoverForeground: "oklch(0.15 0.01 40)",
      primary: "oklch(0.60 0.18 40)", // Orange
      primaryForeground: "oklch(0.99 0 0)",
      secondary: "oklch(0.96 0.01 40)",
      secondaryForeground: "oklch(0.25 0.02 40)",
      muted: "oklch(0.96 0.01 40)",
      mutedForeground: "oklch(0.50 0.01 40)",
      accent: "oklch(0.94 0.02 40)",
      accentForeground: "oklch(0.25 0.02 40)",
      destructive: "oklch(0.577 0.245 27.325)",
      border: "oklch(0.90 0.01 40)",
      input: "oklch(0.90 0.01 40)",
      ring: "oklch(0.60 0.18 40)",
      sidebar: "oklch(0.98 0.005 40)",
      sidebarForeground: "oklch(0.20 0.01 40)",
      sidebarPrimary: "oklch(0.60 0.18 40)",
      sidebarPrimaryForeground: "oklch(0.99 0 0)",
      sidebarAccent: "oklch(0.94 0.02 40)",
      sidebarAccentForeground: "oklch(0.25 0.02 40)",
      sidebarBorder: "oklch(0.90 0.01 40)",
      sidebarRing: "oklch(0.60 0.18 40)",
    },
    dark: {
      background: "oklch(0.13 0.01 40)",
      foreground: "oklch(0.98 0.005 40)",
      card: "oklch(0.18 0.01 40)",
      cardForeground: "oklch(0.98 0.005 40)",
      popover: "oklch(0.18 0.01 40)",
      popoverForeground: "oklch(0.98 0.005 40)",
      primary: "oklch(0.70 0.20 40)",
      primaryForeground: "oklch(0.13 0.01 40)",
      secondary: "oklch(0.24 0.015 40)",
      secondaryForeground: "oklch(0.98 0.005 40)",
      muted: "oklch(0.24 0.015 40)",
      mutedForeground: "oklch(0.70 0.01 40)",
      accent: "oklch(0.28 0.02 40)",
      accentForeground: "oklch(0.98 0.005 40)",
      destructive: "oklch(0.704 0.191 22.216)",
      border: "oklch(1 0 0 / 10%)",
      input: "oklch(1 0 0 / 15%)",
      ring: "oklch(0.70 0.20 40)",
      sidebar: "oklch(0.16 0.01 40)",
      sidebarForeground: "oklch(0.98 0.005 40)",
      sidebarPrimary: "oklch(0.70 0.20 40)",
      sidebarPrimaryForeground: "oklch(0.13 0.01 40)",
      sidebarAccent: "oklch(0.24 0.015 40)",
      sidebarAccentForeground: "oklch(0.98 0.005 40)",
      sidebarBorder: "oklch(1 0 0 / 10%)",
      sidebarRing: "oklch(0.70 0.20 40)",
    },
  },

  rose: {
    light: {
      background: "oklch(0.99 0 0)",
      foreground: "oklch(0.15 0.01 350)",
      card: "oklch(1 0 0)",
      cardForeground: "oklch(0.15 0.01 350)",
      popover: "oklch(1 0 0)",
      popoverForeground: "oklch(0.15 0.01 350)",
      primary: "oklch(0.58 0.18 350)", // Rose
      primaryForeground: "oklch(0.99 0 0)",
      secondary: "oklch(0.96 0.01 350)",
      secondaryForeground: "oklch(0.25 0.02 350)",
      muted: "oklch(0.96 0.01 350)",
      mutedForeground: "oklch(0.50 0.01 350)",
      accent: "oklch(0.94 0.02 350)",
      accentForeground: "oklch(0.25 0.02 350)",
      destructive: "oklch(0.577 0.245 27.325)",
      border: "oklch(0.90 0.01 350)",
      input: "oklch(0.90 0.01 350)",
      ring: "oklch(0.58 0.18 350)",
      sidebar: "oklch(0.98 0.005 350)",
      sidebarForeground: "oklch(0.20 0.01 350)",
      sidebarPrimary: "oklch(0.58 0.18 350)",
      sidebarPrimaryForeground: "oklch(0.99 0 0)",
      sidebarAccent: "oklch(0.94 0.02 350)",
      sidebarAccentForeground: "oklch(0.25 0.02 350)",
      sidebarBorder: "oklch(0.90 0.01 350)",
      sidebarRing: "oklch(0.58 0.18 350)",
    },
    dark: {
      background: "oklch(0.13 0.01 350)",
      foreground: "oklch(0.98 0.005 350)",
      card: "oklch(0.18 0.01 350)",
      cardForeground: "oklch(0.98 0.005 350)",
      popover: "oklch(0.18 0.01 350)",
      popoverForeground: "oklch(0.98 0.005 350)",
      primary: "oklch(0.68 0.20 350)",
      primaryForeground: "oklch(0.13 0.01 350)",
      secondary: "oklch(0.24 0.015 350)",
      secondaryForeground: "oklch(0.98 0.005 350)",
      muted: "oklch(0.24 0.015 350)",
      mutedForeground: "oklch(0.70 0.01 350)",
      accent: "oklch(0.28 0.02 350)",
      accentForeground: "oklch(0.98 0.005 350)",
      destructive: "oklch(0.704 0.191 22.216)",
      border: "oklch(1 0 0 / 10%)",
      input: "oklch(1 0 0 / 15%)",
      ring: "oklch(0.68 0.20 350)",
      sidebar: "oklch(0.16 0.01 350)",
      sidebarForeground: "oklch(0.98 0.005 350)",
      sidebarPrimary: "oklch(0.68 0.20 350)",
      sidebarPrimaryForeground: "oklch(0.13 0.01 350)",
      sidebarAccent: "oklch(0.24 0.015 350)",
      sidebarAccentForeground: "oklch(0.98 0.005 350)",
      sidebarBorder: "oklch(1 0 0 / 10%)",
      sidebarRing: "oklch(0.68 0.20 350)",
    },
  },
};

export const themeDisplayNames: Record<ThemeName, string> = {
  default: "Default",
  emerald: "Emerald",
  blue: "Blue",
  purple: "Purple",
  orange: "Orange",
  rose: "Rose",
};
