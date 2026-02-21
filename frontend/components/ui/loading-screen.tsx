"use client";

import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 20 }}
        className="flex flex-col items-center gap-6"
      >
        <motion.div
          className="flex items-center gap-3"
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          <div className="relative">
            <motion.div
              className="absolute inset-0 rounded-xl bg-foreground/10 blur-xl"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            />
            <div className="relative flex items-center gap-2 rounded-xl bg-muted p-4">
              <FileText className="size-8 text-foreground" />
            </div>
          </div>
        </motion.div>
        
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <motion.p
            className="text-sm text-muted-foreground"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            {message}
          </motion.p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Inline loading indicator for smaller areas
export function InlineLoader({ text = "Loading" }: { text?: string }) {
  return (
    <motion.div
      className="flex items-center gap-2 text-sm text-muted-foreground"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <Spinner size="sm" />
      <span>{text}</span>
    </motion.div>
  );
}

// Card loading state
export function CardLoader() {
  return (
    <motion.div
      className="rounded-xl border border-border bg-background p-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <div className="flex items-center justify-center py-8">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-muted-foreground">Loading content...</p>
        </div>
      </div>
    </motion.div>
  );
}
