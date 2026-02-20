"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

export function SplineScene() {
  const [cursor, setCursor] = useState({ x: 0, y: 0, active: false });

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      const x = event.clientX - window.innerWidth / 2;
      const y = event.clientY - window.innerHeight / 2;
      setCursor({ x, y, active: true });
    };

    const resetCursor = () => {
      setCursor({ x: 0, y: 0, active: false });
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", resetCursor);
    window.addEventListener("blur", resetCursor);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", resetCursor);
      window.removeEventListener("blur", resetCursor);
    };
  }, []);

  const robotOffset = useMemo(
    () => ({
      x: cursor.active ? cursor.x * 0.09 : 0,
      y: cursor.active ? cursor.y * 0.09 : 0,
    }),
    [cursor]
  );

  const eyeOffset = useMemo(() => {
    const limit = 6;
    const distance = Math.hypot(cursor.x, cursor.y);

    if (!cursor.active || distance === 0) {
      return { x: 0, y: 0 };
    }

    const scale = Math.min(limit / distance, 1);
    return {
      x: cursor.x * scale,
      y: cursor.y * scale,
    };
  }, [cursor]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="relative h-115 w-full overflow-hidden rounded-2xl border border-foreground/30 bg-background"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,var(--color-muted),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,var(--color-muted),transparent_55%)] opacity-60" />

      <motion.h2
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        className="absolute left-1/2 top-4 z-20 -translate-x-1/2 text-sm font-medium tracking-wide text-foreground"
      >
        Our ai is still looking after you
      </motion.h2>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1, x: robotOffset.x, y: robotOffset.y }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="absolute inset-0 z-10 flex items-center justify-center"
      >
        <div className="relative">
          <motion.div
            animate={{ scale: cursor.active ? 1.12 : 1, opacity: cursor.active ? 0.9 : 0.65 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted/40 blur-3xl"
          />

          <motion.div
            animate={{ y: cursor.active ? -4 : 0, rotate: cursor.active ? cursor.x * 0.0025 : 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="relative w-72"
          >
            <div className="mx-auto w-52 rounded-3xl border border-foreground/25 bg-card px-4 pb-4 pt-4 shadow-sm">
              <div className="relative h-20 rounded-2xl border border-border bg-background/90 px-4 py-4">
                <div className="flex h-full items-center justify-between rounded-xl border border-border bg-card px-4">
                  <div className="relative h-8 w-8 rounded-full bg-foreground/85">
                    <motion.div
                      animate={{ x: eyeOffset.x, y: eyeOffset.y }}
                      transition={{ duration: 0.12, ease: "easeOut" }}
                      className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background"
                    />
                  </div>
                  <div className="relative h-8 w-8 rounded-full bg-foreground/85">
                    <motion.div
                      animate={{ x: eyeOffset.x, y: eyeOffset.y }}
                      transition={{ duration: 0.12, ease: "easeOut" }}
                      className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background"
                    />
                  </div>
                </div>
              </div>

              <div className="mx-auto mt-3 h-1.5 w-16 rounded-full bg-muted-foreground/60" />

              <div className="mx-auto mt-3 flex w-20 items-center justify-between rounded-full border border-border bg-background px-2.5 py-1.5">
                <motion.div
                  animate={{ opacity: cursor.active ? [0.45, 1, 0.45] : 0.55 }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                  className="h-2 w-2 rounded-full bg-foreground/75"
                />
                <motion.div
                  animate={{ opacity: cursor.active ? [1, 0.45, 1] : 0.55 }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
                  className="h-2 w-2 rounded-full bg-foreground/75"
                />
                <motion.div
                  animate={{ opacity: cursor.active ? [0.45, 1, 0.45] : 0.55 }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                  className="h-2 w-2 rounded-full bg-foreground/75"
                />
              </div>
            </div>

            <div className="mx-auto mt-2 h-4 w-9 rounded-lg border border-border bg-card" />

            <div className="relative mx-auto mt-2 w-56 rounded-3xl border border-foreground/20 bg-card px-5 pb-5 pt-4">
              <div className="mx-auto mb-4 grid w-36 grid-cols-4 gap-2">
                <div className="h-2 rounded-full bg-muted" />
                <div className="h-2 rounded-full bg-muted" />
                <div className="h-2 rounded-full bg-muted" />
                <div className="h-2 rounded-full bg-muted" />
              </div>

              <div className="absolute -left-6 top-8 h-16 w-5 rounded-full border border-border bg-card" />
              <div className="absolute -right-6 top-8 h-16 w-5 rounded-full border border-border bg-card" />

              <div className="mx-auto h-12 w-20 rounded-2xl border border-border bg-background/80" />
            </div>

            <div className="mx-auto mt-2 flex w-40 items-center justify-between">
              <div className="h-4 w-14 rounded-full border border-border bg-card" />
              <div className="h-4 w-14 rounded-full border border-border bg-card" />
            </div>
          </motion.div>
        </div>
      </motion.div>

    </motion.div>
  );
}