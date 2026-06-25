"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, Search, ListChecks, Newspaper, User, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const ITEMS = [
  { href: "/",        label: "Map",     icon: Map },
  { href: "/search",  label: "Search",  icon: Search },
  { href: "/lists",   label: "Lists",   icon: ListChecks },
  { href: "/feed",    label: "Feed",    icon: Newspaper },
  { href: "/profile", label: "Profile", icon: User },
];

const AVATAR_COLORS = ["#D44C2A", "#3A7A5C", "#2C5A8A", "#8A4A2C"];
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

type UserProfile = {
  username: string | null;
  display_name: string | null;
  is_admin: boolean | null;
};

export function Nav() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("username, display_name, is_admin")
        .eq("id", user.id)
        .single()
        .then(({ data }) => { if (data) setProfile(data); });
    });
  }, []);

  const displayName = profile?.display_name ?? profile?.username ?? "";
  const initials = displayName.slice(0, 2).toUpperCase();
  const color = displayName ? avatarColor(displayName) : "#8C7E72";

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <nav className="hidden w-48 shrink-0 flex-col border-r border-[#D4C8B4] bg-[#F5F0E8] p-3 lg:flex">
        <Link
          href="/"
          className="mb-5 px-3 text-2xl font-extrabold tracking-tight text-[#D44C2A]"
        >
          foodraccoon
        </Link>

        <ul className="flex flex-1 flex-col gap-0.5">
          {ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                    active
                      ? "bg-[#F5E8E4] text-[#D44C2A]"
                      : "text-[#8C7E72] hover:bg-[#EDE6D8] hover:text-[#2C2420]",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-2 flex flex-col gap-0.5 border-t border-[#EDE6D8] pt-2">
          {profile?.is_admin && (
            <Link
              href="/admin"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#8C7E72] transition-colors hover:bg-[#EDE6D8] hover:text-[#2C2420]"
            >
              <Shield className="size-4" />
              Admin
            </Link>
          )}

          {/* User avatar + @username */}
          {profile ? (
            <Link
              href="/profile"
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 transition-colors hover:bg-[#EDE6D8]"
            >
              <div
                className="flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {initials}
              </div>
              <span className="truncate text-xs font-medium text-[#2C2420]">
                @{profile.username ?? "me"}
              </span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#8C7E72] transition-colors hover:bg-[#EDE6D8] hover:text-[#2C2420]"
            >
              <User className="size-4 shrink-0" />
              Sign in
            </Link>
          )}
        </div>
      </nav>

      {/* ── Mobile bottom nav ── */}
      <nav
        className="fixed z-20 flex items-center rounded-2xl border border-[#D4C8B4] bg-[#F5F0E8] py-2 shadow-lg lg:hidden"
        style={{
          left: "1rem",
          right: "1rem",
          bottom: "calc(env(safe-area-inset-bottom) + 8px)",
        }}
      >
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <span
                className={cn(
                  "flex h-7 w-12 items-center justify-center rounded-full transition-all duration-200",
                  active
                    ? "bg-[#D44C2A] shadow-[0_2px_8px_rgba(212,76,42,0.35)]"
                    : "hover:bg-[#EDE6D8]",
                )}
              >
                <Icon
                  className={cn(
                    "size-[18px] transition-colors",
                    active ? "text-white" : "text-[#8C7E72]",
                  )}
                />
              </span>
              <span
                className={cn(
                  "text-[10px]",
                  active ? "font-bold text-[#D44C2A]" : "font-medium text-[#8C7E72]",
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
