"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/lib/auth-context";
import { ArrowRight } from "lucide-react";

export function HomeActions() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <motion.div
        className="flex gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className={buttonVariants({ size: "lg" })}>
          <Spinner size="sm" className="mr-2" />
          Loading...
        </div>
      </motion.div>
    );
  }

  if (user) {
    return (
      <motion.div
        className="flex flex-wrap gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Link href="/dashboard">
          <motion.span
            className={buttonVariants({ size: "lg" })}
            whileHover={{ scale: 1.02, x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            Go to Dashboard
            <ArrowRight className="ml-2 size-4" />
          </motion.span>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="flex flex-wrap gap-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Link href="/signup">
        <motion.span
          className={buttonVariants({ size: "lg" })}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Start Generating
          <ArrowRight className="ml-2 size-4" />
        </motion.span>
      </Link>
      <Link href="/login">
        <motion.span
          className={buttonVariants({ size: "lg", variant: "outline" })}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Sign In
        </motion.span>
      </Link>
    </motion.div>
  );
}
