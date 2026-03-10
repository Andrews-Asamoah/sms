"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

interface SchoolThemeInjectorProps {
  primaryColor: string;
  secondaryColor: string;
}

export function SchoolThemeInjector({
  primaryColor,
  secondaryColor,
}: SchoolThemeInjectorProps) {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!primaryColor) return;

    const isDark = resolvedTheme === "dark";
    const root = document.documentElement;

    // 1. Convert HEX to HSL
    const hsl = hexToHslValues(primaryColor);
    
    // 2. Adjust Lightness for contrast if needed
    // In dark mode, ensure color isn't too dark. In light mode, ensure it's not too light.
    let { h, s, l } = hsl;
    
    if (isDark) {
      if (l < 40) l = 40; // Ensure it's visible on dark backgrounds
    } else {
      if (l > 85) l = 85; // Ensure it's visible on light backgrounds
    }

    // 3. Set the variables
    root.style.setProperty("--school-primary", `hsl(${h} ${s}% ${l}%)`);
    
    // Calculate foreground color (white or black based on lightness)
    const foreground = l > 65 ? "oklch(0.205 0 0)" : "oklch(0.985 0 0)";
    root.style.setProperty("--school-primary-foreground", foreground);

    if (secondaryColor) {
      const sHsl = hexToHslValues(secondaryColor);
      let sl = sHsl.l;
      if (isDark && sl < 30) sl = 30;
      root.style.setProperty("--school-secondary", `hsl(${sHsl.h} ${sHsl.s}% ${sl}%)`);
      
      const sForeground = sl > 65 ? "oklch(0.205 0 0)" : "oklch(0.985 0 0)";
      root.style.setProperty("--school-secondary-foreground", sForeground);
    }
    
    // Cleanup - remove variables if components unmount (optional but good for multi-school apps)
    return () => {
      root.style.removeProperty("--school-primary");
      root.style.removeProperty("--school-primary-foreground");
      root.style.removeProperty("--school-secondary");
      root.style.removeProperty("--school-secondary-foreground");
    };
  }, [primaryColor, secondaryColor, resolvedTheme]);

  return null;
}

/**
 * Returns HSL values from HEX
 */
function hexToHslValues(hex: string): { h: number; s: number; l: number } {
  hex = hex.replace(/^#/, "");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}
