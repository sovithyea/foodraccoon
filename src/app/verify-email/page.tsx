"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function VerifyEmailPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function resend() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      await supabase.auth.resend({ type: "signup", email: user.email });
    }
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F0E8] px-6">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-1">
          <Link href="/" className="text-3xl font-extrabold tracking-tight text-[#D44C2A]">
            foodraccoon
          </Link>
        </div>

        <div className="rounded-2xl border border-[#D4C8B4] bg-[#EDE6D8] p-6 space-y-4">
          <div className="text-4xl">✉️</div>
          <h1 className="text-lg font-semibold text-[#2C2420]">Verify your email</h1>
          <p className="text-sm text-[#8C7E72]">
            Check your inbox for a confirmation link. You need to verify your email before making changes.
          </p>

          {sent ? (
            <p className="text-sm font-medium text-[#3A7A5C]">Resent! Check your inbox.</p>
          ) : (
            <button
              onClick={resend}
              disabled={loading}
              className="w-full rounded-xl bg-[#D44C2A] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#B83D1E] disabled:opacity-60"
            >
              {loading ? "Sending…" : "Resend verification email"}
            </button>
          )}
        </div>

        <Link href="/" className="text-sm text-[#8C7E72] hover:text-[#D44C2A]">
          ← Back to app
        </Link>
      </div>
    </div>
  );
}
