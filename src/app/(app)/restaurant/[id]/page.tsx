import { notFound } from "next/navigation";
import Link from "next/link";
import { Navigation } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { createClient } from "@/lib/supabase/server";
import { priceLabel } from "@/lib/restaurants";
import { getHoursStatus } from "@/lib/openNow";
import { cn } from "@/lib/utils";
import { RatingSection } from "@/components/restaurant/RatingSection";

const HERO_GRADIENTS = [
  "linear-gradient(130deg, #9E5230 0%, #C47040 35%, #D58860 65%, #E0A07A 100%)",
  "linear-gradient(130deg, #2C5A38 0%, #3A7A5C 50%, #4A9A7C 100%)",
  "linear-gradient(130deg, #2C3A5A 0%, #3A5A8A 50%, #4A6AAA 100%)",
  "linear-gradient(130deg, #5A2C2A 0%, #8A3A38 50%, #AA5A58 100%)",
];
function heroGradient(name: string) {
  return HERO_GRADIENTS[name.charCodeAt(0) % HERO_GRADIENTS.length];
}

const AVATAR_COLORS = ["#D44C2A", "#3A7A5C", "#2C5A8A", "#8A4A2C"];
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function RestaurantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: restaurant }, { data: reviews }] = await Promise.all([
    supabase.from("restaurants").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("user_restaurants")
      .select("rating, review, visited_at, profiles(username, display_name, avatar_url)")
      .eq("restaurant_id", id)
      .eq("is_public", true)
      .in("status", ["visited", "favourite"])
      .order("visited_at", { ascending: false }),
  ]);

  if (!restaurant) notFound();

  const ratingsWithValue = reviews?.filter((r) => r.rating != null) ?? [];
  const avg =
    ratingsWithValue.length > 0
      ? (ratingsWithValue.reduce((s, r) => s + (r.rating ?? 0), 0) / ratingsWithValue.length).toFixed(1)
      : null;

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${restaurant.latitude},${restaurant.longitude}${restaurant.google_place_id ? `&destination_place_id=${restaurant.google_place_id}` : ""}`;

  const opening_hours = restaurant.opening_hours as { weekday_text: string[] } | null;
  const nowUtc = new Date();
  const hoursStatus = getHoursStatus(opening_hours, nowUtc);
  const todayIdx = new Date(nowUtc.getTime() + 7 * 60 * 60 * 1000).getUTCDay();

  return (
    <div className="mx-auto h-full max-w-lg overflow-y-auto bg-[#F5F0E8] pb-20 md:pb-0">

      {/* ── Hero ── */}
      <div className="relative h-[220px] w-full shrink-0 overflow-hidden">
        {restaurant.cover_photo_url ? (
          <img src={restaurant.cover_photo_url} alt={restaurant.name} width={800} height={220} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" style={{ background: heroGradient(restaurant.name) }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

        {/* Breadcrumb */}
        <div className="absolute left-3 top-3 rounded-full bg-black/30 px-3 py-1.5 backdrop-blur-sm">
          <Breadcrumb items={[{ label: "Map", href: "/" }, { label: restaurant.name }]} />
        </div>

        {/* Name + meta */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-white">{restaurant.name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            {hoursStatus && (
              <div className="flex items-center gap-1.5">
                <span className={cn("size-2 rounded-full", hoursStatus.open ? "bg-green-400" : "bg-red-400")} />
                <span className="text-xs font-medium text-white/90">
                  {hoursStatus.open ? "Open" : "Closed"}
                  {hoursStatus.timeLabel ? ` · ${hoursStatus.timeLabel}` : ""}
                </span>
              </div>
            )}
            <span className="text-xs text-white/70">
              {[priceLabel(restaurant.price_range), restaurant.district].filter(Boolean).join(" · ")}
            </span>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="space-y-4 px-4 pt-4 pb-6">

        {/* Tags */}
        {(restaurant.cuisine_type.length > 0 || restaurant.tags.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {restaurant.cuisine_type.map((c: string) => (
              <span key={c} className="rounded-full border border-[#D4C8B4] bg-[#EDE6D8] px-2.5 py-1 text-xs font-medium text-[#2C2420]">
                {c}
              </span>
            ))}
            {restaurant.tags.map((t: string) => (
              <span key={t} className="rounded-full border border-[#D4C8B4] bg-transparent px-2.5 py-1 text-xs font-normal text-[#8C7E72]">
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Stats row */}
        <div className="flex overflow-hidden rounded-xl border border-[#D4C8B4] bg-[#EDE6D8]">
          {restaurant.google_rating != null && (
            <div className="flex flex-1 flex-col items-center gap-0.5 border-r border-[#D4C8B4] py-2.5">
              <span className="text-xs font-semibold text-[#2C2420]">★ {restaurant.google_rating.toFixed(1)}</span>
              {restaurant.google_rating_count != null && (
                <span className="text-[10px] text-[#8C7E72]">{restaurant.google_rating_count.toLocaleString()} reviews</span>
              )}
            </div>
          )}
          <div className="flex flex-1 flex-col items-center gap-0.5 py-2.5">
            {avg ? (
              <>
                <span className="text-xs font-bold text-[#D44C2A]">{avg}/10</span>
                <span className="text-[10px] text-[#8C7E72]">{ratingsWithValue.length} {ratingsWithValue.length === 1 ? "rating" : "ratings"}</span>
              </>
            ) : (
              <>
                <span className="text-xs text-[#8C7E72]">—</span>
                <span className="text-[10px] text-[#8C7E72]">Community</span>
              </>
            )}
          </div>
        </div>

        {/* Your status — client island */}
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#8C7E72]">Your status</p>
          <RatingSection restaurantId={restaurant.id} />
        </div>

        {/* Get Directions */}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#D44C2A] py-3.5 text-sm font-bold text-white shadow-[0_3px_10px_rgba(212,76,42,0.30)] transition-all hover:bg-[#B83D1E] active:scale-[.98]"
        >
          <Navigation className="size-4" /> Get Directions →
        </a>

        {/* Hours */}
        {opening_hours && (
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8C7E72]">Hours</p>
            <div className="overflow-hidden rounded-xl border border-[#D4C8B4]">
              {DAYS.map((day, idx) => {
                const entry = opening_hours.weekday_text.find((s) => s.startsWith(day + ":"));
                const hoursStr = entry ? entry.slice(day.length + 1).trim() : "—";
                const isToday = idx === todayIdx;
                return (
                  <div
                    key={day}
                    className={cn(
                      "flex justify-between px-4 py-2 text-sm",
                      isToday
                        ? "bg-[#F5E8E4] font-semibold text-[#D44C2A]"
                        : "bg-[#EDE6D8] text-[#8C7E72]",
                      idx < DAYS.length - 1 && "border-b border-[#D4C8B4]",
                    )}
                  >
                    <span>{day}</span>
                    <span>{hoursStr}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Community ratings */}
        {reviews && reviews.length > 0 && (
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#8C7E72]">Community</p>
            <div className="flex flex-col gap-2">
              {reviews.map((row, i) => {
                const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
                const name = profile?.display_name ?? profile?.username ?? "User";
                const initials = name.slice(0, 2).toUpperCase();
                const color = avatarColor(name);
                const score = row.rating as number | null;
                return (
                  <div key={i} className="flex gap-3 rounded-xl border border-[#D4C8B4] bg-[#EDE6D8] p-3.5">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt={name} width={36} height={36} className="size-9 shrink-0 rounded-full object-cover" />
                    ) : (
                      <div
                        className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: color }}
                      >
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-[#2C2420]">@{profile?.username ?? "user"}</span>
                        <div className="flex shrink-0 items-center gap-2">
                          {row.visited_at && (
                            <span className="text-xs text-[#8C7E72]">
                              {new Date(row.visited_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                            </span>
                          )}
                          {score != null && (
                            <span className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-bold",
                              score >= 8.5 ? "bg-[#D44C2A] text-white" : "border border-[#D4C8B4] bg-[#F5F0E8] text-[#2C2420]",
                            )}>
                              {score}/10
                            </span>
                          )}
                        </div>
                      </div>
                      {row.review && <p className="text-sm text-[#5A4E48]">{row.review}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
