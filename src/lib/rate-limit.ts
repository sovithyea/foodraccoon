import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 60;

// Middleware runs on the Edge runtime, so the counter is reached over HTTP
// rather than a Postgres connection. The RPC is SECURITY DEFINER and granted
// to anon, which keeps the service-role key out of the edge bundle.
let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return client;
}

/**
 * Returns true when `key` has exceeded MAX_REQUESTS in the current window.
 *
 * Fails OPEN. If the counter is unreachable the request is allowed through and
 * the error is logged: a limiter that fails closed takes the whole API down on
 * a database hiccup, which is worse than a brief unlimited window on endpoints
 * that still sit behind auth guards and RLS.
 */
export async function isRateLimited(key: string): Promise<boolean> {
  try {
    const { data, error } = await getClient().rpc("check_rate_limit", {
      p_key: key,
      p_max_requests: MAX_REQUESTS,
      p_window_seconds: WINDOW_SECONDS,
    });

    if (error) {
      console.error("[rate-limit] failing open:", error.message);
      return false;
    }

    return data === true;
  } catch (err) {
    console.error("[rate-limit] failing open:", err);
    return false;
  }
}
