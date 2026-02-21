"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useState, FormEvent } from "react";

import { SplineScene } from "@/components/spline-scene";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/toast";

type AuthShellProps = {
  mode: "login" | "signup";
};

const formVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

export function AuthShell({ mode }: AuthShellProps) {
  const isLogin = mode === "login";
  const router = useRouter();
  const { login, register } = useAuth();
  const { success, error: showError } = useToast();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isLogin && password !== confirmPassword) {
      setError("Passwords do not match");
      showError("Passwords do not match");
      return;
    }

    if (!isLogin && password.length < 8) {
      setError("Password must be at least 8 characters");
      showError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
        success("Welcome back!");
      } else {
        await register(name, email, password);
        success("Account created successfully!");
      }
      router.push("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-10 lg:grid-cols-2 lg:items-center lg:px-10">
        <motion.div
          className="order-2 lg:order-1"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <Card>
            <CardHeader className="space-y-4">
              <Link
                href="/"
                className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground group"
              >
                <motion.span
                  className="inline-flex"
                  whileHover={{ x: -4 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <ArrowLeft className="size-4" />
                </motion.span>
                Back to home
              </Link>

              <Badge variant="secondary" className="w-fit gap-1">
                {isLogin ? "Welcome back" : "Get started"}
              </Badge>

              <div className="space-y-2">
                <CardTitle className="text-2xl sm:text-3xl tracking-tight">
                  {isLogin ? "Sign in to LexGen AI" : "Create your LexGen AI account"}
                </CardTitle>
                <CardDescription className="text-sm">
                  {isLogin
                    ? "Continue drafting and reviewing contracts with clause-level risk insights."
                    : "Join LexGen AI to generate smarter contracts and review risks before signing."}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent>
              <motion.form
                className="space-y-4"
                onSubmit={handleSubmit}
                variants={formVariants}
                initial="hidden"
                animate="visible"
              >
                {error && (
                  <motion.div
                    className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {error}
                  </motion.div>
                )}

                {!isLogin && (
                  <motion.div className="space-y-2" variants={itemVariants}>
                    <label htmlFor="name" className="text-sm font-medium">
                      Full name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="Aryan Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={!isLogin}
                      disabled={loading}
                      className="h-11 w-full rounded-lg border border-border bg-background px-4 text-sm outline-none transition-all duration-200 placeholder:text-muted-foreground focus:border-foreground focus:ring-2 focus:ring-foreground/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </motion.div>
                )}

                <motion.div className="space-y-2" variants={itemVariants}>
                  <label htmlFor="email" className="text-sm font-medium">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11 w-full rounded-lg border border-border bg-background px-4 text-sm outline-none transition-all duration-200 placeholder:text-muted-foreground focus:border-foreground focus:ring-2 focus:ring-foreground/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </motion.div>

                <motion.div className="space-y-2" variants={itemVariants}>
                  <label htmlFor="password" className="text-sm font-medium">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    placeholder={isLogin ? "Enter your password" : "Create a strong password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11 w-full rounded-lg border border-border bg-background px-4 text-sm outline-none transition-all duration-200 placeholder:text-muted-foreground focus:border-foreground focus:ring-2 focus:ring-foreground/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </motion.div>

                {!isLogin && (
                  <motion.div className="space-y-2" variants={itemVariants}>
                    <label htmlFor="confirmPassword" className="text-sm font-medium">
                      Confirm password
                    </label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required={!isLogin}
                      disabled={loading}
                      className="h-11 w-full rounded-lg border border-border bg-background px-4 text-sm outline-none transition-all duration-200 placeholder:text-muted-foreground focus:border-foreground focus:ring-2 focus:ring-foreground/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </motion.div>
                )}

                <motion.div variants={itemVariants}>
                  <Button type="submit" size="lg" className="w-full" loading={loading}>
                    {isLogin ? "Sign In" : "Create Account"}
                  </Button>
                </motion.div>
              </motion.form>

              <motion.div
                className="mt-4 text-center text-sm text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {isLogin ? "Don't have an account?" : "Already have an account?"} {" "}
                <Link
                  href={isLogin ? "/signup" : "/login"}
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </Link>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="order-1 lg:order-2 hidden lg:block">
          <SplineScene />
        </div>
      </section>
    </main>
  );
}