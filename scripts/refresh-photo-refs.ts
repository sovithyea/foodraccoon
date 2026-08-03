/**
 * Backfill: Google Places photo references are not permanent — they expire
 * some time after being issued. `restaurants.cover_photo_url` was populated
 * at import time (scripts/import-places.ts) and those references have since
 * gone stale, so /api/photos now gets `400 INVALID_ARGUMENT` from Google for
 * nearly every restaurant. This re-fetches a fresh reference per restaurant
 * from the Places API (New) Place Details endpoint and updates the row.
 *
 * NOT wired into any npm script on purpose — this mutates production data
 * and burns Places API Place Details quota (one call per restaurant with a
 * google_place_id).
 *
 *   npx tsx scripts/refresh-photo-refs.ts          # dry run, prints what would change
 *   npx tsx scripts/refresh-photo-refs.ts --write   # actually updates rows
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/database.types";

function loadEnv() {
  try {
    const raw = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    // env may already be set in shell
  }
}
loadEnv();

const write = process.argv.includes("--write");
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY!;

// Keep well under Places API's default per-key QPS so a 3800-row run doesn't 429.
const CONCURRENCY = 5;
const RETRY_DELAYS_MS = [500, 2000, 5000];

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractPhotoRef(name: string | undefined): string | null {
  if (!name) return null;
  const parts = name.split("/");
  return parts[parts.length - 1] || null;
}

async function fetchFreshPhotoRef(placeId: string): Promise<
  { ok: true; ref: string | null } | { ok: false; status: number }
> {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?fields=photos&key=${GOOGLE_API_KEY}`,
    );
    if (res.status === 429 && attempt < RETRY_DELAYS_MS.length) {
      await sleep(RETRY_DELAYS_MS[attempt]);
      continue;
    }
    if (!res.ok) return { ok: false, status: res.status };
    const data = (await res.json()) as { photos?: { name: string }[] };
    return { ok: true, ref: extractPhotoRef(data.photos?.[0]?.name) };
  }
  return { ok: false, status: 429 };
}

async function main() {
  if (!GOOGLE_API_KEY) throw new Error("GOOGLE_PLACES_API_KEY is required");

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const PAGE_SIZE = 1000;
  const rows: { id: string; name: string; google_place_id: string | null; cover_photo_url: string | null }[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data: page, error } = await supabase
      .from("restaurants")
      .select("id, name, google_place_id, cover_photo_url")
      .not("google_place_id", "is", null)
      .not("cover_photo_url", "is", null)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    if (!page || page.length === 0) break;
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  console.log(`${rows.length} restaurant(s) with a cover_photo_url to refresh.`);

  let updated = 0;
  let unchanged = 0;
  let noPhotoOnGoogle = 0;
  let failed = 0;
  let done = 0;

  async function worker(queue: typeof rows) {
    for (const row of queue) {
      const result = await fetchFreshPhotoRef(row.google_place_id!);
      done++;

      if (!result.ok) {
        failed++;
        console.warn(`  [fail ${result.status}] ${row.id} ${row.name}`);
      } else if (!result.ref) {
        noPhotoOnGoogle++;
        console.warn(`  [no-photo] ${row.id} ${row.name} — Google now reports no photos`);
      } else if (result.ref === row.cover_photo_url) {
        unchanged++;
      } else {
        updated++;
        if (write) {
          const { error: updateError } = await supabase
            .from("restaurants")
            .update({ cover_photo_url: result.ref })
            .eq("id", row.id);
          if (updateError) {
            console.error(`  [db-fail] ${row.id} ${row.name}:`, updateError.message);
          }
        }
      }

      if (done % 200 === 0) console.log(`  ...${done}/${rows.length}`);
    }
  }

  // Fixed-size worker pool over the row list — simplest way to bound
  // concurrency without pulling in a queue dependency.
  const chunks: (typeof rows)[] = Array.from({ length: CONCURRENCY }, () => []);
  rows.forEach((row, i) => chunks[i % CONCURRENCY].push(row));
  await Promise.all(chunks.map(worker));

  console.log(
    write
      ? `Updated ${updated} row(s). Unchanged: ${unchanged}. No photo on Google: ${noPhotoOnGoogle}. Failed: ${failed}.`
      : `Dry run: would update ${updated} row(s). Unchanged: ${unchanged}. No photo on Google: ${noPhotoOnGoogle}. Failed: ${failed}. Re-run with --write to apply.`,
  );
}

main();
