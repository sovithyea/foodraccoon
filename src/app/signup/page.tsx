"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F5F0E8] px-6">
      <div className="w-full max-w-sm space-y-8">

        <div className="text-center space-y-1">
          <Link href="/" className="text-3xl font-extrabold tracking-tight text-[#D44C2A]">
            foodraccoon
          </Link>
          <p className="text-sm text-[#8C7E72]">Phnom Penh restaurant discovery</p>
        </div>

        <div className="rounded-2xl border border-[#D4C8B4] bg-[#EDE6D8] p-6 shadow-sm space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

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
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-[#8C7E72]">Minimum 6 characters</p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <p className="text-xs text-[#8C7E72] text-center">
              By creating an account you agree to our{" "}
              <Link href="/terms" className="text-[#D44C2A] hover:underline">Terms</Link>
              {" "}and{" "}
              <Link href="/privacy" className="text-[#D44C2A] hover:underline">Privacy Policy</Link>.
            </p>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-[#8C7E72]">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-[#D44C2A] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
