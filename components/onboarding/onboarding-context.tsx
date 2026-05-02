"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useOnboarding } from "./use-onboarding";
import { OnboardingTour } from "./onboarding-tour";

// ============================================================================
// Context
// ============================================================================

interface OnboardingContextValue {
  /** Re-opens the tour at step 1 and clears the completion flag. */
  replay: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface OnboardingProviderProps {
  schoolSlug: string;
  userId: string;
  role: string;
  children: ReactNode;
}

/**
 * Single source of truth for the onboarding tour.
 *
 * - Owns the `useOnboarding` hook (one instance per layout).
 * - Exposes `replay()` to any descendant via `useOnboardingContext()`.
 * - Renders `<OnboardingTour>` as a Dialog portal above the sidebar/content.
 */
export function OnboardingProvider({
  schoolSlug,
  userId,
  role,
  children,
}: OnboardingProviderProps) {
  const {
    isOpen,
    isMounted,
    currentStep,
    currentStepIndex,
    totalSteps,
    next,
    prev,
    skip,
    replay,
  } = useOnboarding({ schoolSlug, userId, role });

  return (
    <OnboardingContext.Provider value={{ replay }}>
      {children}
      {/* Tour renders as a Radix Dialog portal — floats above the full layout */}
      <OnboardingTour
        schoolSlug={schoolSlug}
        isOpen={isOpen}
        isMounted={isMounted}
        currentStep={currentStep}
        currentStepIndex={currentStepIndex}
        totalSteps={totalSteps}
        next={next}
        prev={prev}
        skip={skip}
      />
    </OnboardingContext.Provider>
  );
}

// ============================================================================
// Consumer hook
// ============================================================================

/**
 * Returns the onboarding context value.
 * Safe to call outside the provider — returns a no-op `replay` so callers
 * don't need to null-check (e.g. layouts that have no tour configured).
 */
export function useOnboardingContext(): OnboardingContextValue {
  return useContext(OnboardingContext) ?? { replay: () => {} };
}
