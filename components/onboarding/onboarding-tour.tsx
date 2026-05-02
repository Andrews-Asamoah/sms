"use client";

import type { TourStep } from "./tour-config";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import Link from "next/link";

interface OnboardingTourProps {
  schoolSlug: string;
  isOpen: boolean;
  isMounted: boolean;
  currentStep: TourStep | undefined;
  currentStepIndex: number;
  totalSteps: number;
  next: () => void;
  prev: () => void;
  skip: () => void;
}

export function OnboardingTour({
  schoolSlug,
  isOpen,
  isMounted,
  currentStep,
  currentStepIndex,
  totalSteps,
  next,
  prev,
  skip,
}: OnboardingTourProps) {

  if (!isMounted || !isOpen || !currentStep) return null;

  const isLastStep = currentStepIndex === totalSteps - 1;
  const isFirstStep = currentStepIndex === 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && skip()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-background border-border shadow-2xl rounded-2xl gap-0">
        <div className="flex flex-col md:flex-row h-full max-h-[85vh]">
          {/* Left Panel: Visual/Icon */}
          <div className="bg-primary/5 dark:bg-primary/10 p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-border md:w-2/5 min-h-[200px] relative overflow-hidden">
             {/* Decorative background blobs */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
            
            <div className="relative z-10 w-24 h-24 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center text-primary mb-6 shadow-inner">
              <currentStep.icon className="w-12 h-12" />
            </div>
            
            <div className="relative z-10 text-center">
              <span className="text-sm font-semibold tracking-wider text-primary/80 uppercase">
                Step {currentStepIndex + 1} of {totalSteps}
              </span>
            </div>
          </div>

          {/* Right Panel: Content */}
          <div className="p-6 md:p-8 flex flex-col md:w-3/5 flex-1 bg-card">
            <DialogHeader className="text-left space-y-3 mb-6">
              <DialogTitle className="text-2xl font-bold tracking-tight leading-tight">
                {currentStep.title}
              </DialogTitle>
              <DialogDescription className="text-base text-muted-foreground leading-relaxed">
                {currentStep.description}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto pr-2 mb-6 space-y-4">
               {currentStep.features && currentStep.features.length > 0 && (
                <ul className="space-y-3">
                  {currentStep.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                         <div className="w-2 h-2 rounded-full bg-primary" />
                      </div>
                      <span className="text-sm font-medium text-foreground/80">{feature}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Actions / Navigation */}
            <div className="mt-auto flex flex-col gap-4">
              {currentStep.href && (
                <Button variant="secondary" asChild className="w-full justify-between group">
                  <Link href={`/${schoolSlug}${currentStep.href.replace(`/${schoolSlug}`, '')}`}>
                    <span>Take me there</span>
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                </Button>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={skip}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Skip Tour
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={prev}
                    disabled={isFirstStep}
                    className="h-9 w-9"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only">Previous step</span>
                  </Button>
                  <Button
                    onClick={next}
                    className="gap-2 h-9 px-4"
                  >
                    {isLastStep ? "Finish" : "Next"}
                    {!isLastStep && <ChevronRight className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
