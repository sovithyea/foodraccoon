import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import type { Database, TablesUpdate } from "@/lib/database.types";
import { parseBody, checkOrigin, BadRequest } from "@/lib/request-guard";

const adminDb = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!checkOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = await parseBody<{
    tags?: string[];
    cuisine_type?: string[];
    price_range?: number | null;
    district?: string;
    name?: string;
    address?: string | null;
  }>(request, ["tags", "cuisine_type", "price_range", "district", "name", "address"]);

  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const updates: TablesUpdate<"restaurants"> = {};

  if ("tags" in body) {
    if (!Array.isArray(body.tags) || body.tags.some((t) => typeof t !== "string")) {
      return BadRequest("tags must be an array of strings");
    }
    updates.tags = body.tags;
  }
  if ("cuisine_type" in body) {
    if (!Array.isArray(body.cuisine_type) || body.cuisine_type.some((c) => typeof c !== "string")) {
      return BadRequest("cuisine_type must be an array of strings");
    }
    updates.cuisine_type = body.cuisine_type;
  }
  if ("price_range" in body) {
    const pr = body.price_range;
    if (pr !== null && pr !== undefined && (!Number.isInteger(pr) || pr < 1 || pr > 4)) {
      return BadRequest("price_range must be an integer between 1 and 4");
    }
    updates.price_range = pr ?? null;
  }
  if ("district" in body) {
    if (typeof body.district !== "string") return BadRequest("district must be a string");
    updates.district = body.district;
  }
  if ("name" in body) {
    if (typeof body.name !== "string" || !body.name.trim()) return BadRequest("name must be a non-empty string");
    updates.name = body.name.trim();
  }
  if ("address" in body) {
    if (body.address !== null && typeof body.address !== "string") return BadRequest("address must be a string or null");
    updates.address = body.address;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const { data, error } = await adminDb
    .from("restaurants")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });
  return NextResponse.json({ restaurant: data });
}
