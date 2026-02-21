import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";

import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-background text-foreground shadow-sm transition-all duration-200 hover:shadow-md",
        className
      )}
      {...props}
    />
  );
}

// Animated Card with hover effects
interface MotionCardProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  hoverEffect?: boolean;
}

const MotionCard = React.forwardRef<HTMLDivElement, MotionCardProps>(
  ({ className, hoverEffect = true, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          "rounded-xl border border-border bg-background text-foreground shadow-sm",
          className
        )}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        whileHover={hoverEffect ? { y: -2, boxShadow: "0 8px 30px rgba(0,0,0,0.12)" } : undefined}
        {...props}
      />
    );
  }
);
MotionCard.displayName = "MotionCard";

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1.5 p-6", className)} {...props} />;
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 className={cn("font-semibold tracking-tight", className)} {...props} />;
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex items-center p-6 pt-0", className)} {...props} />;
}

export { Card, MotionCard, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };