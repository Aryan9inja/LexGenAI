import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: {
      type: "spring" as const,
      damping: 25,
      stiffness: 300,
    },
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: 10,
    transition: {
      duration: 0.15,
    },
  },
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
}: ModalProps) {
  // Close on escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={onClose}
          />
          
          {/* Modal Content */}
          <motion.div
            className={cn(
              "relative z-10 w-full max-w-md mx-4 bg-background rounded-xl shadow-2xl border border-border",
              className
            )}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Header */}
            {(title || description) && (
              <div className="flex items-start justify-between gap-4 p-5 pb-0">
                <div className="space-y-1.5 flex-1">
                  {title && (
                    <h2 className="text-lg font-semibold leading-tight">{title}</h2>
                  )}
                  {description && (
                    <p className="text-sm text-muted-foreground">{description}</p>
                  )}
                </div>
                <motion.button
                  onClick={onClose}
                  className="rounded-md p-1.5 hover:bg-muted transition-colors -mr-1 -mt-1"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X className="size-4 text-muted-foreground" />
                </motion.button>
              </div>
            )}
            
            {/* Body */}
            <div className="p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

interface SuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (answer: string) => void;
  question: string;
  riskLevel?: "high" | "medium" | "low";
  isLoading?: boolean;
  isLoadingQuestion?: boolean;
}

export function SuggestionModal({
  isOpen,
  onClose,
  onSubmit,
  question,
  riskLevel = "medium",
  isLoading = false,
  isLoadingQuestion = false,
}: SuggestionModalProps) {
  const [answer, setAnswer] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Focus textarea when modal opens and question is loaded
  React.useEffect(() => {
    if (isOpen && !isLoadingQuestion) {
      setAnswer("");
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen, isLoadingQuestion]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoadingQuestion) {
      onSubmit(answer);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (!isLoadingQuestion) {
        onSubmit(answer);
      }
    }
  };

  const riskColors = {
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-orange-100 text-orange-800 border-orange-200",
    low: "bg-yellow-100 text-yellow-800 border-yellow-200",
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Apply Suggestion"
      description={isLoadingQuestion ? "Loading suggestion details..." : "Provide additional context to improve the suggestion"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Risk Level Badge */}
        <div className={cn(
          "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border",
          riskColors[riskLevel]
        )}>
          {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} Risk
        </div>
        
        {/* Question - Show skeleton while loading */}
        <div className="rounded-lg bg-muted/50 border border-border p-4">
          {isLoadingQuestion ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-4 bg-muted-foreground/20 rounded w-full" />
              <div className="h-4 bg-muted-foreground/20 rounded w-4/5" />
              <div className="h-4 bg-muted-foreground/20 rounded w-3/5" />
            </div>
          ) : (
            <p className="text-sm font-medium leading-relaxed">{question}</p>
          )}
        </div>
        
        {/* Answer Input */}
        <div className="space-y-2">
          <textarea
            ref={textareaRef}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isLoadingQuestion ? "Loading..." : "Enter your answer here... (optional)"}
            disabled={isLoading || isLoadingQuestion}
            className="w-full min-h-25 rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted rounded border">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted rounded border">Enter</kbd> to submit
          </p>
        </div>
        
        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || isLoadingQuestion}
            className="px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Applying...
              </>
            ) : isLoadingQuestion ? (
              <>
                <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading...
              </>
            ) : (
              "Apply Suggestion"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
