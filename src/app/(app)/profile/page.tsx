import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: statusRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, display_name, city, bio")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("user_restaurants")
      .select("status")
      .eq("user_id", user.id),
  ]);

  const savedCount = statusRows?.length ?? 0;
  const visitedCount = statusRows?.filter((r) => r.status === "visited").length ?? 0;

  const initials = (profile?.display_name ?? profile?.username ?? "?")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="mx-auto h-full max-w-lg overflow-y-auto px-6 py-10 pb-20 md:pb-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <Avatar className="size-20">
          <AvatarFallback className="text-xl">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-xl font-semibold">
            {profile?.display_name ?? "Foodracoon user"}
          </h1>
          <p className="text-muted-foreground text-sm">
            @{profile?.username ?? "—"} · {profile?.city ?? "Phnom Penh"}
          </p>
        </div>
        {profile?.bio && <p className="text-sm">{profile.bio}</p>}
      </div>

      <div className="mt-8 grid grid-cols-3 gap-3 text-center">
        <Stat label="Saved" value={savedCount} />
        <Stat label="Visited" value={visitedCount} />
        <Stat label="Lists" value={0} />
      </div>

      <p className="text-muted-foreground mt-10 text-center text-xs">
        Lists and followers arrive in later phases.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-muted-foreground text-xs">{label}</div>
    </div>
  );
}
