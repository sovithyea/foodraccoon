/**
 * One-time backfill: strips the leaked GOOGLE_PLACES_API_KEY out of any
 * `restaurants.cover_photo_url` rows that still hold the old full
 * "https://maps.googleapis.com/.../photo?...&key=..." URL, replacing it
 * with the bare `photo_reference` (see src/lib/places.ts, scripts/import-places*.ts,
 * src/app/api/admin/suggestions/[id]/import/route.ts — all three write
 * sites were fixed to stop storing the key going forward).
 *
 * NOT wired into any npm script on purpose — this mutates production data.
 * Run manually after confirming SUPABASE_SERVICE_ROLE_KEY is set:
 *
 *   npx tsx scripts/strip-photo-keys.ts        # dry run, prints what would change
 *   npx tsx scripts/strip-photo-keys.ts --write  # actually updates rows
 *
 * You should also rotate GOOGLE_PLACES_API_KEY in Google Cloud Console —
 * it was served to every client that hit GET /api/restaurants before this
 * fix, so treat it as already public regardless of this backfill.
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

function extractRef(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get("photo_reference");
  } catch {
    return null;
  }
}

async function main() {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await supabase
    .from("restaurants")
    .select("id, cover_photo_url")
    .like("cover_photo_url", "https://maps.googleapis.com/%key=%");

  if (error) throw error;
  if (!data || data.length === 0) {
    console.log("No rows with a leaked key found.");
    return;
  }

  console.log(`${data.length} row(s) with a leaked key.`);

  let updated = 0;
  let unparseable = 0;

  for (const row of data) {
    const ref = row.cover_photo_url ? extractRef(row.cover_photo_url) : null;
    if (!ref) {
      unparseable++;
      console.warn(`  [skip] ${row.id} — could not extract photo_reference from: ${row.cover_photo_url}`);
      continue;
    }

    if (write) {
      const { error: updateError } = await supabase
        .from("restaurants")
        .update({ cover_photo_url: ref })
        .eq("id", row.id);
      if (updateError) {
        console.error(`  [fail] ${row.id}:`, updateError.message);
        continue;
      }
    }
    updated++;
  }

  console.log(
    write
      ? `Updated ${updated} row(s), ${unparseable} unparseable.`
      : `Dry run: would update ${updated} row(s), ${unparseable} unparseable. Re-run with --write to apply.`,
  );
}

main();
