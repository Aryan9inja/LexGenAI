"use client";

import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  sm: "size-4",
  md: "size-6",
  lg: "size-8",
  xl: "size-12",
};

export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <div className={cn("relative", sizeMap[size], className)}>
      <div className="absolute inset-0 rounded-full border-2 border-muted-foreground/20" />
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-foreground animate-spin" />
    </div>
  );
}

export function SpinnerOverlay({ message }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="xl" />
        {message && (
          <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
        )}
      </div>
    </div>
  );
}

export function PulseLoader({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span className="size-2 rounded-full bg-foreground animate-bounce [animation-delay:-0.3s]" />
      <span className="size-2 rounded-full bg-foreground animate-bounce [animation-delay:-0.15s]" />
      <span className="size-2 rounded-full bg-foreground animate-bounce" />
    </div>
  );
}
