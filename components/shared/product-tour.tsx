"use client";

import { useEffect, useRef, useState } from "react";
import { driver, DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

interface ProductTourProps {
  /** Unique ID for this tour to store completion status in localStorage */
  tourId: string;
  /** Array of steps for the tour */
  steps: DriveStep[];
  /** Whether to start the tour automatically if not seen before (default: true) */
  autoStart?: boolean;
}

export function ProductTour({
  tourId,
  steps,
  autoStart = true,
}: ProductTourProps) {
  const [mounted, setMounted] = useState(false);
  const driverObj = useRef<ReturnType<typeof driver> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !autoStart) return;

    // Check if user has already seen this tour on this device
    const hasSeenTour = localStorage.getItem(`tour_${tourId}`);
    if (hasSeenTour) return;

    // Initialize driver
    driverObj.current = driver({
      showProgress: true,
      steps: steps,
      popoverClass: "driverjs-theme",
      onDestroyed: () => {
        // Mark as seen when closed or completed
        localStorage.setItem(`tour_${tourId}`, "true");
      },
    });

    // We add a tiny delay to ensure all DOM elements are fully mounted
    // especially in complex dashboards with Suspense boundaries
    const timeout = setTimeout(() => {
      driverObj.current?.drive();
    }, 1000);

    return () => clearTimeout(timeout);
  }, [mounted, steps, tourId, autoStart]);

  // Render a hidden element just to inject the Global CSS overrides
  return (
    <style suppressHydrationWarning>{`
      .driverjs-theme {
        font-family: inherit;
        border-radius: 0.75rem;
        padding: 1rem;
      }
      .driverjs-theme .driver-popover-title {
        font-size: 1.125rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
      }
      .driverjs-theme .driver-popover-description {
        font-size: 0.875rem;
        color: #4b5563;
        line-height: 1.5;
      }
      .dark .driverjs-theme {
        background-color: #0f172a;
        color: #f8fafc;
        border: 1px solid #1e293b;
      }
      .dark .driverjs-theme .driver-popover-description {
        color: #cbd5e1;
      }
      .dark .driverjs-theme .driver-popover-footer button {
        background-color: #1e293b;
        color: #f8fafc;
        border-color: #334155;
      }
      .dark .driverjs-theme .driver-popover-footer button:hover {
        background-color: #334155;
      }
      .dark .driverjs-theme .driver-popover-navigation-btns button.driver-next-btn {
        background-color: #3b82f6;
        color: white;
        border: none;
      }
      .dark .driverjs-theme .driver-popover-navigation-btns button.driver-next-btn:hover {
        background-color: #2563eb;
      }
      .driverjs-theme .driver-popover-navigation-btns button.driver-next-btn {
        background-color: #2563eb;
        color: white;
        text-shadow: none;
        border: none;
      }
    `}</style>
  );
}
