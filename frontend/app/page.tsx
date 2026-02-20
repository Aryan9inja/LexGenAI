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

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto grid w-full max-w-7xl gap-10 px-6 py-14 lg:grid-cols-2 lg:items-center lg:px-10">
        <div className="space-y-6">
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="size-3.5" />
            RAG-Powered Legal Assistant
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            LexGen AI builds smarter contracts for everyone.
          </h1>
          <p className="max-w-xl text-base text-muted-foreground md:text-lg">
            Create legally structured contracts from simple prompts, then review clause-level risk insights for ambiguity,
            bias, non-compliance, and unfair terms before you sign.
          </p>
          <HomeActions />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4" />
            Built for individuals and small organizations without legal expertise.
          </div>
        </div>
        <SplineScene />
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-10">
        <div className="grid gap-4 md:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="h-full">
              <CardHeader>
                <div className="mb-2 flex size-10 items-center justify-center rounded-md bg-muted">
                  <Icon className="size-5" />
                </div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-10">
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
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-xs font-medium text-foreground">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 pb-16 pt-8 text-center lg:px-10">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Accessible. Transparent. Reliable.</CardTitle>
            <CardDescription className="mx-auto max-w-2xl">
              LexGen AI helps you draft and review legal contracts with confidence while reducing cost and complexity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/signup">
              <Button size="lg">Get Started with LexGen AI</Button>
            </Link>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}