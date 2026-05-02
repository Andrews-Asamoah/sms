"use client";

import { useState, useEffect, useCallback } from "react";
import type { TourStep } from "./tour-config";

interface UseOnboardingProps {
  schoolSlug: string;
  userId: string;
  role: string;
}

export function useOnboarding({ schoolSlug, userId, role }: UseOnboardingProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  // Steps are loaded lazily — only the role-specific slice is fetched.
  const [steps, setSteps] = useState<TourStep[]>([]);

  const totalSteps = steps.length;
  const storageKey = `sms:onboarding:${schoolSlug}:${userId}:${role}`;

  // Dynamically import only the steps for the active role so the full
  // 5-role config isn't bundled into every layout's initial JS chunk.
  useEffect(() => {
    import("./tour-config").then(({ TOUR_STEPS }) => {
      setSteps(TOUR_STEPS[role] ?? []);
    });
  }, [role]);

  useEffect(() => {
    setIsMounted(true);
    if (totalSteps === 0) return;

    const hasCompleted = localStorage.getItem(storageKey);
    if (!hasCompleted) {
      // Delay slightly to let the page render first
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [storageKey, totalSteps]);

  const finish = useCallback(() => {
    setIsOpen(false);
    localStorage.setItem(storageKey, "true");
  }, [storageKey]);

  const skip = useCallback(() => {
    finish();
  }, [finish]);

  const next = useCallback(() => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      finish();
    }
  }, [currentStepIndex, totalSteps, finish]);

  const prev = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  const replay = useCallback(() => {
    if (totalSteps > 0) {
      setCurrentStepIndex(0);
      setIsOpen(true);
    }
  }, [totalSteps]);

  const currentStep = steps[currentStepIndex];

  return {
    isOpen,
    isMounted,
    currentStep,
    currentStepIndex,
    totalSteps,
    next,
    prev,
    skip,
    replay,
  };
}
