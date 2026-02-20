"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";

export function HomeActions() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex gap-3">
        <div className={buttonVariants({ size: "lg" })}>
          <Loader2 className="mr-2 size-4 animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard" className={buttonVariants({ size: "lg" })}>
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Link href="/signup" className={buttonVariants({ size: "lg" })}>
        Start Generating
      </Link>
      <Link href="/login" className={buttonVariants({ size: "lg", variant: "outline" })}>
        Sign In
      </Link>
    </div>
  );
}
