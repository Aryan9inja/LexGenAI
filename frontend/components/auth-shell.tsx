"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useState, FormEvent } from "react";

import { SplineScene } from "@/components/spline-scene";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";

type AuthShellProps = {
  mode: "login" | "signup";
};

export function AuthShell({ mode }: AuthShellProps) {
  const isLogin = mode === "login";
  const router = useRouter();
  const { login, register } = useAuth();
  
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
      return;
    }

    if (!isLogin && password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-10 lg:grid-cols-2 lg:items-center lg:px-10">
        <div className="order-2 lg:order-1">
          <Card>
            <CardHeader className="space-y-4">
              <Link
                href="/"
                className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
                Back to home
              </Link>

              <Badge variant="secondary" className="w-fit gap-1">
                {isLogin ? "Welcome back" : "Get started"}
              </Badge>

              <div className="space-y-2">
                <CardTitle className="text-3xl tracking-tight">
                  {isLogin ? "Sign in to LexGen AI" : "Create your LexGen AI account"}
                </CardTitle>
                <CardDescription>
                  {isLogin
                    ? "Continue drafting and reviewing contracts with clause-level risk insights."
                    : "Join LexGen AI to generate smarter contracts and review risks before signing."}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                {error && (
                  <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                    {error}
                  </div>
                )}

                {!isLogin && (
                  <div className="space-y-2">
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
                      className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                )}

                <div className="space-y-2">
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
                    className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
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
                    className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                {!isLogin && (
                  <div className="space-y-2">
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
                      className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                )}

                <Button type="submit" size="lg" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {isLogin ? "Sign In" : "Create Account"}
                </Button>
              </form>

              <div className="mt-4 text-center text-sm text-muted-foreground">
                {isLogin ? "Don’t have an account?" : "Already have an account?"} {" "}
                <Link
                  href={isLogin ? "/signup" : "/login"}
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="order-1 lg:order-2">
          <SplineScene />
        </div>
      </section>
    </main>
  );
}