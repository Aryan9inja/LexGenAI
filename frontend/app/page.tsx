"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { SplineScene } from "@/components/spline-scene";
import { HomeActions } from "@/components/home-actions";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: FileText,
    title: "AI Contract Drafting",
    description:
      "Upload a brief or describe your needs in plain language to generate legally structured contracts in minutes.",
  },
  {
    icon: AlertTriangle,
    title: "Risk & Ambiguity Detection",
    description:
      "Automatically flags risky, vague, biased, or potentially unfavorable clauses with explainable reasoning.",
  },
  {
    icon: ShieldCheck,
    title: "Safer Alternatives",
    description:
      "Provides recommended clause replacements aligned with better legal clarity and practical safeguards.",
  },
];

const flow = [
  "Describe your use case in everyday language or upload a draft.",
  "LexGen AI retrieves relevant legal context and composes structured contract text.",
  "The analyzer highlights risky clauses and suggests safer alternatives with clear explanations.",
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut" as const,
    },
  },
};

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto grid w-full max-w-7xl gap-10 px-6 py-14 lg:grid-cols-2 lg:items-center lg:px-10">
        <motion.div
          className="space-y-6"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.div variants={itemVariants}>
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="size-3.5" />
              RAG-Powered Legal Assistant
            </Badge>
          </motion.div>
          <motion.h1
            variants={itemVariants}
            className="text-4xl font-semibold tracking-tight md:text-5xl"
          >
            LexGen AI builds smarter contracts for everyone.
          </motion.h1>
          <motion.p
            variants={itemVariants}
            className="max-w-xl text-base text-muted-foreground md:text-lg"
          >
            Create legally structured contracts from simple prompts, then review clause-level risk insights for ambiguity,
            bias, non-compliance, and unfair terms before you sign.
          </motion.p>
          <motion.div variants={itemVariants}>
            <HomeActions />
          </motion.div>
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <CheckCircle2 className="size-4" />
            Built for individuals and small organizations without legal expertise.
          </motion.div>
        </motion.div>
        <SplineScene />
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-10">
        <motion.div
          className="grid gap-4 md:grid-cols-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
        >
          {features.map(({ icon: Icon, title, description }, index) => (
            <motion.div key={title} variants={itemVariants} custom={index}>
              <Card className="h-full interactive-card">
                <CardHeader>
                  <motion.div
                    className="mb-2 flex size-10 items-center justify-center rounded-md bg-muted"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Icon className="size-5" />
                  </motion.div>
                  <CardTitle>{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardHeader>
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Scale className="size-4" />
                How LexGen AI Works
              </div>
              <CardTitle>From plain language to safer legal outcomes</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm text-muted-foreground md:text-base">
                {flow.map((item, index) => (
                  <motion.li
                    key={item}
                    className="flex items-start gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.15, duration: 0.4 }}
                  >
                    <motion.span
                      className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-xs font-medium text-foreground"
                      whileHover={{ scale: 1.15, backgroundColor: "var(--foreground)", color: "var(--background)" }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      {index + 1}
                    </motion.span>
                    <span>{item}</span>
                  </motion.li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 pb-16 pt-8 text-center lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
        >
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>Accessible. Transparent. Reliable.</CardTitle>
              <CardDescription className="mx-auto max-w-2xl">
                LexGen AI helps you draft and review legal contracts with confidence while reducing cost and complexity.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/signup">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button size="lg">Get Started with LexGen AI</Button>
                </motion.div>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </section>
    </main>
  );
}