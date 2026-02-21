"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || React.useId();
    const [isFocused, setIsFocused] = React.useState(false);

    return (
      <div className="space-y-2">
        {label && (
          <motion.label
            htmlFor={inputId}
            className="block text-sm font-medium text-foreground"
            animate={{ color: isFocused ? "var(--foreground)" : "var(--foreground)" }}
          >
            {label}
          </motion.label>
        )}
        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            className={cn(
              "h-11 w-full rounded-lg border bg-background px-4 text-sm outline-none transition-all duration-200",
              "placeholder:text-muted-foreground",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error
                ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                : "border-border focus:border-foreground focus:ring-2 focus:ring-foreground/10",
              className
            )}
            {...props}
          />
          {isFocused && (
            <motion.div
              layoutId="input-focus"
              className="absolute inset-0 -z-10 rounded-lg bg-foreground/5"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15 }}
            />
          )}
        </div>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-red-500"
          >
            {error}
          </motion.p>
        )}
        {hint && !error && (
          <p className="text-sm text-muted-foreground">{hint}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || React.useId();
    const [isFocused, setIsFocused] = React.useState(false);

    return (
      <div className="space-y-2">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <div className="relative">
          <textarea
            id={inputId}
            ref={ref}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            className={cn(
              "min-h-32 w-full rounded-lg border bg-background px-4 py-3 text-sm outline-none transition-all duration-200 resize-y",
              "placeholder:text-muted-foreground",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error
                ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                : "border-border focus:border-foreground focus:ring-2 focus:ring-foreground/10",
              className
            )}
            {...props}
          />
          {isFocused && (
            <motion.div
              className="absolute inset-0 -z-10 rounded-lg bg-foreground/5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            />
          )}
        </div>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-red-500"
          >
            {error}
          </motion.p>
        )}
        {hint && !error && (
          <p className="text-sm text-muted-foreground">{hint}</p>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";
