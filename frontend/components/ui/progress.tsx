"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProgressProps {
  value?: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  indeterminate?: boolean;
}

const sizeMap = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
};

export function Progress({
  value = 0,
  max = 100,
  className,
  showLabel = false,
  size = "md",
  indeterminate = false,
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-muted",
          sizeMap[size]
        )}
      >
        {indeterminate ? (
          <motion.div
            className="h-full bg-foreground rounded-full"
            initial={{ x: "-100%", width: "30%" }}
            animate={{ x: "400%" }}
            transition={{
              repeat: Infinity,
              duration: 1.5,
              ease: "easeInOut",
            }}
          />
        ) : (
          <motion.div
            className="h-full bg-foreground rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        )}
      </div>
      {showLabel && !indeterminate && (
        <p className="mt-1 text-xs text-muted-foreground text-right">
          {Math.round(percentage)}%
        </p>
      )}
    </div>
  );
}

// Step progress indicator
interface StepProgressProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export function StepProgress({ steps, currentStep, className }: StepProgressProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          <div className="flex items-center gap-2">
            <motion.div
              className={cn(
                "size-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                index < currentStep
                  ? "bg-foreground text-background"
                  : index === currentStep
                  ? "bg-foreground text-background ring-4 ring-foreground/20"
                  : "bg-muted text-muted-foreground"
              )}
              initial={false}
              animate={{
                scale: index === currentStep ? 1.1 : 1,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              {index < currentStep ? (
                <motion.svg
                  viewBox="0 0 24 24"
                  className="size-4"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  <path
                    fill="currentColor"
                    d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
                  />
                </motion.svg>
              ) : (
                index + 1
              )}
            </motion.div>
            <span
              className={cn(
                "text-sm hidden sm:block",
                index <= currentStep ? "text-foreground font-medium" : "text-muted-foreground"
              )}
            >
              {step}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className="flex-1 h-0.5 bg-muted mx-2 min-w-8">
              <motion.div
                className="h-full bg-foreground"
                initial={{ width: "0%" }}
                animate={{ width: index < currentStep ? "100%" : "0%" }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
