import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { priceLabel } from "@/lib/restaurants";
import { isOpenNow, getHoursStatus } from "@/lib/openNow";
import { cn } from "@/lib/utils";

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
      ? (
          ratingsWithValue.reduce((s, r) => s + (r.rating ?? 0), 0) /
          ratingsWithValue.length
        ).toFixed(1)
      : null;

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${restaurant.latitude},${restaurant.longitude}${restaurant.google_place_id ? `&destination_place_id=${restaurant.google_place_id}` : ""}`;

  const opening_hours = restaurant.opening_hours as { weekday_text: string[] } | null;
  const nowUtc = new Date();
  const hoursStatus = getHoursStatus(opening_hours, nowUtc);

  // UTC+7 day index for highlighting today's row.
  const todayIdx = new Date(nowUtc.getTime() + 7 * 60 * 60 * 1000).getUTCDay();
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <div className="mx-auto h-full max-w-2xl overflow-y-auto pb-20 md:pb-0">
      {/* Cover photo / gradient hero */}
      <div className="relative h-48 w-full shrink-0">
        {restaurant.cover_photo_url ? (
          <img
            src={restaurant.cover_photo_url}
            alt={restaurant.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[#D44C2A] to-[#2C2420]" />
        )}
        <Link
          href="/"
          className="absolute top-3 left-3 flex items-center gap-1.5 rounded-lg border border-white/30 bg-black/40 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm hover:bg-black/60"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
      </div>

      {/* Content */}
      <div className="space-y-4 px-6 py-5">
        <div>
          <h1 className="text-2xl font-semibold">{restaurant.name}</h1>
          {restaurant.address && (
            <p className="text-muted-foreground mt-1 text-sm">{restaurant.address}</p>
          )}
        </div>

        {/* Badges: district, cuisines, price */}
        <div className="flex flex-wrap items-center gap-1.5">
          {restaurant.district && (
            <Badge variant="secondary">{restaurant.district}</Badge>
          )}
          {restaurant.cuisine_type.map((c: string) => (
            <Badge key={c} variant="secondary">{c}</Badge>
          ))}
          {restaurant.tags.map((t: string) => (
            <Badge key={t} variant="outline" className="font-normal">{t}</Badge>
          ))}
          {restaurant.price_range && (
            <span className="text-primary text-sm font-medium">
              {priceLabel(restaurant.price_range)}
            </span>
          )}
        </div>

        {/* Google rating */}
        {restaurant.google_rating != null && (
          <div className="text-muted-foreground flex items-center gap-1 text-sm">
            <Star className="size-3.5 fill-current" />
            <span>
              {restaurant.google_rating.toFixed(1)}
              {restaurant.google_rating_count != null && (
                <span> ({restaurant.google_rating_count.toLocaleString()} reviews)</span>
              )}
              {" "}on Google
            </span>
          </div>
        )}

        {/* Google Maps link */}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm hover:underline"
        >
          <MapPin className="size-3.5 shrink-0" />
          Open in Google Maps
        </a>

        {opening_hours && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">Hours</h2>
              {hoursStatus && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                    hoursStatus.open
                      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
                  )}
                >
                  <span className={cn("size-1.5 rounded-full", hoursStatus.open ? "bg-green-500" : "bg-red-500")} />
                  {hoursStatus.open ? "Open now" : "Closed"}
                </span>
              )}
            </div>
            <div className="space-y-1">
              {DAYS.map((day, idx) => {
                const entry = opening_hours.weekday_text.find((s) => s.startsWith(day + ":"));
                const hoursStr = entry ? entry.slice(day.length + 1).trim() : "—";
                const isToday = idx === todayIdx;
                return (
                  <div
                    key={day}
                    className={cn(
                      "flex justify-between rounded px-2 py-1 text-sm",
                      isToday ? "bg-accent font-medium text-foreground" : "text-muted-foreground",
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

        <hr className="border-border" />

        {/* Community ratings */}
        <div className="space-y-4">
          <div className="flex items-baseline gap-2">
            <h2 className="font-semibold">Community Ratings</h2>
            {avg && (
              <span className="text-muted-foreground text-sm">
                {avg}★ from {ratingsWithValue.length} rating{ratingsWithValue.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {reviews && reviews.length > 0 ? (
            <div className="space-y-3">
              {reviews.map((row, i) => {
                const profile = Array.isArray(row.profiles)
                  ? row.profiles[0]
                  : row.profiles;
                const name = profile?.display_name ?? profile?.username ?? "User";
                const initials = name.slice(0, 2).toUpperCase();

                return (
                  <div key={i} className="bg-card flex gap-3 rounded-lg border p-4">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={name}
                        className="size-9 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: "#D44C2A" }}
                      >
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          @{profile?.username ?? "user"}
                        </span>
                        <div className="text-muted-foreground flex shrink-0 items-center gap-2 text-xs">
                          {row.visited_at && <span>{row.visited_at}</span>}
                          {row.rating != null && (
                            <span className="text-foreground font-semibold">
                              {row.rating}/10
                            </span>
                          )}
                        </div>
                      </div>
                      {row.review && (
                        <p className="text-muted-foreground text-sm">{row.review}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No reviews yet — be the first
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
