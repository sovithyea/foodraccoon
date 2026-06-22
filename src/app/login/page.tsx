"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setResetLoading(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    setResetLoading(false);
    setResetSent(true);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F0E8] px-6">
      <div className="w-full max-w-sm space-y-8">

        {/* Wordmark */}
        <div className="text-center space-y-1">
          <Link href="/" className="text-3xl font-extrabold tracking-tight text-[#D44C2A]">
            foodraccoon
          </Link>
          <p className="text-sm text-[#8C7E72]">Phnom Penh restaurant discovery</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[#D4C8B4] bg-[#EDE6D8] p-6 shadow-sm space-y-5">

          {resetMode ? (
            resetSent ? (
              <div className="space-y-4 text-center">
                <p className="text-sm font-semibold text-[#2C2420]">Check your email</p>
                <p className="text-sm text-[#8C7E72]">
                  A password reset link has been sent to <strong>{email}</strong>.
                </p>
                <button
                  onClick={() => { setResetMode(false); setResetSent(false); }}
                  className="text-sm font-medium text-[#D44C2A] underline underline-offset-2"
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[#2C2420]">Reset your password</p>
                  <p className="text-xs text-[#8C7E72]">Enter your email and we'll send a reset link.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={resetLoading}>
                  {resetLoading ? "Sending…" : "Send reset link"}
                </Button>
                <button
                  type="button"
                  onClick={() => setResetMode(false)}
                  className="w-full text-center text-sm text-[#8C7E72] hover:text-[#2C2420]"
                >
                  Back to sign in
                </button>
              </form>
            )
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={() => { setResetMode(true); setError(null); }}
                    className="text-xs text-[#8C7E72] hover:text-[#D44C2A] transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          )}
        </div>

        {/* Sign up link */}
        {!resetMode && (
          <p className="text-center text-sm text-[#8C7E72]">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold text-[#D44C2A] hover:underline">
              Create one
            </Link>
          </p>
        )}

        <p className="text-center text-xs text-[#8C7E72]">
          <Link href="/terms" className="hover:text-[#D44C2A] hover:underline">Terms</Link>
          {" · "}
          <Link href="/privacy" className="hover:text-[#D44C2A] hover:underline">Privacy</Link>
        </p>
      </div>
    </div>
  );
}
