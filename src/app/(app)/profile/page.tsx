import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { EditProfileButton } from "@/components/profile/EditProfileButton";

// Deterministic avatar background colour from display name
const AVATAR_COLORS = ["#D44C2A", "#3A7A5C", "#2C5A8A", "#8A4A2C"];
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}


function relativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7)  return `${days} days ago`;
  if (days < 14) return "1 week ago";
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="w-full max-w-xs space-y-6">
          <div className="space-y-2">
            <p className="text-3xl font-extrabold tracking-tight text-[#D44C2A]">foodraccoon</p>
            <p className="text-sm text-[#8C7E72]">Track the restaurants you love in Phnom Penh</p>
          </div>
          <div className="rounded-2xl border border-[#D4C8B4] bg-[#EDE6D8] p-5 text-left space-y-3">
            {[
              { icon: "📍", text: "Save places you want to try" },
              { icon: "✅", text: "Log restaurants you've visited" },
              { icon: "📋", text: "Build and share custom lists" },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-[#2C2420]">
                <span className="text-base leading-none">{icon}</span>
                {text}
              </div>
            ))}
          </div>
          <div className="space-y-2.5">
            <Link
              href="/login"
              className="flex w-full items-center justify-center rounded-xl bg-[#D44C2A] px-4 py-3 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(212,76,42,0.25)] transition-all hover:bg-[#B83D1E] active:scale-95"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="flex w-full items-center justify-center rounded-xl border border-[#D4C8B4] px-4 py-3 text-sm font-semibold text-[#2C2420] transition-all hover:bg-[#EDE6D8] active:scale-95"
            >
              Create account
            </Link>
          </div>
          <p className="text-xs text-[#8C7E72]">
            <Link href="/terms" className="hover:text-[#D44C2A] hover:underline">Terms</Link>
            {" · "}
            <Link href="/privacy" className="hover:text-[#D44C2A] hover:underline">Privacy</Link>
          </p>
        </div>
      </div>
    );
  }

  const [
    { data: profile },
    { data: statusRows },
    { count: listsCount },
    { data: recentRatings },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, display_name, bio, city, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("user_restaurants")
      .select("status, rating")
      .eq("user_id", user.id),
    supabase
      .from("lists")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("user_restaurants")
      .select("rating, visited_at, updated_at, restaurants(name)")
      .eq("user_id", user.id)
      .not("rating", "is", null)
      .order("updated_at", { ascending: false })
      .limit(5),
  ]);

  const visitedCount   = statusRows?.filter((r) => r.status === "visited").length ?? 0;
  const wantToTryCount = statusRows?.filter((r) => r.status === "want_to_try").length ?? 0;
  const ratings        = statusRows?.flatMap((r) => (r.rating != null ? [r.rating] : [])) ?? [];
  const avgRating      =
    ratings.length > 0
      ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
      : "—";

  const displayName = profile?.display_name ?? "FoodRaccoon user";
  const initials    = displayName.slice(0, 2).toUpperCase();
  const color       = avatarColor(displayName);

  // Server action — defined once, reused in both sign-out forms
  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="mx-auto h-full max-w-lg overflow-y-auto px-6 py-10 pb-20 md:pb-10">
      <div className="flex flex-col items-center gap-3 text-center">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={displayName}
            className="size-20 rounded-full object-cover"
            style={{ boxShadow: `0 0 0 3.5px #EDE6D8, 0 0 0 6px #D44C2A` }}
          />
        ) : (
          <div
            className="flex size-20 items-center justify-center rounded-full text-2xl font-bold text-white"
            style={{
              backgroundColor: color,
              boxShadow: `0 0 0 3.5px #EDE6D8, 0 0 0 6px ${color}`,
            }}
          >
            {initials}
          </div>
        )}
        <div>
          <h1 className="text-xl font-semibold text-[#2C2420]">{displayName}</h1>
          <p className="text-sm text-[#8C7E72]">
            @{profile?.username ?? "—"} · {profile?.city ?? "Phnom Penh"}
          </p>
        </div>
        {profile?.bio && <p className="text-sm text-[#5A4E48]">{profile.bio}</p>}
        <EditProfileButton
          profile={{
            display_name: profile?.display_name ?? null,
            username: profile?.username ?? null,
            bio: profile?.bio ?? null,
            city: profile?.city ?? null,
            avatar_url: profile?.avatar_url ?? null,
          }}
        />
      </div>

      <div className="mt-8 grid grid-cols-3 gap-3 text-center">
        <StatCard label="Visited"     value={visitedCount} />
        <StatCard label="Want to Try" value={wantToTryCount} />
        <StatCard label="Avg Rating"  value={avgRating} highlight />
      </div>

      <div className="mt-3 rounded-xl border border-[#D4C8B4] bg-[#EDE6D8] p-4 text-center">
        <div className="text-2xl font-semibold text-[#2C2420]">{listsCount ?? 0}</div>
        <div className="text-xs text-[#8C7E72]">Lists</div>
      </div>

      {recentRatings && recentRatings.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#8C7E72]">
            Recent Ratings
          </h2>
          <div className="flex flex-col gap-2">
            {recentRatings.map((row, i) => {
              const restaurant = Array.isArray(row.restaurants)
                ? row.restaurants[0]
                : row.restaurants;
              const date  = row.visited_at ?? row.updated_at;
              const score = row.rating as number;
              return (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-[#D4C8B4] bg-[#EDE6D8] px-4 py-3"
                >
                  <span className="text-sm font-medium text-[#2C2420]">
                    {restaurant?.name ?? "Unknown"}
                  </span>
                  <div className="flex items-center gap-3 text-sm text-[#8C7E72]">
                    {date && <span>{relativeDate(date)}</span>}
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-bold",
                        score >= 8.5
                          ? "bg-[#D44C2A] text-white"
                          : "border border-[#D4C8B4] bg-[#F5F0E8] text-[#2C2420]",
                      )}
                    >
                      {score}/10
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <form action={signOut} className="mt-10">
        <button
          type="submit"
          className="w-full py-2 text-sm text-[#8C7E72] transition-colors hover:text-[#D44C2A]"
        >
          Sign out
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-[#8C7E72]">
        <Link href="/terms" className="hover:text-[#D44C2A] hover:underline">Terms</Link>
        {" · "}
        <Link href="/privacy" className="hover:text-[#D44C2A] hover:underline">Privacy</Link>
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[#D4C8B4] bg-[#EDE6D8] p-4 text-center">
      <div className={cn("text-2xl font-semibold", highlight ? "text-[#D44C2A]" : "text-[#2C2420]")}>
        {value}
      </div>
      <div className="text-xs text-[#8C7E72]">{label}</div>
    </div>
  );
}
