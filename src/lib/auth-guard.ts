import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

type GuardResult =
  | { user: NonNullable<Awaited<ReturnType<SupabaseClient["auth"]["getUser"]>>["data"]["user"]>; error: null }
  | { user: null; error: NextResponse };

export async function requireUser(supabase: SupabaseClient): Promise<GuardResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  return { user, error: null };
}

export async function requireVerifiedUser(supabase: SupabaseClient): Promise<GuardResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!user.email_confirmed_at) return { user: null, error: NextResponse.json({ error: "Email not verified" }, { status: 403 }) };
  return { user, error: null };
}
