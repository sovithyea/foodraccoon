"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { ListCard } from "@/components/lists/ListCard"
import { CreateListSheet } from "@/components/lists/CreateListSheet"
import { useListsStore } from "@/store/listsStore"
import { useMapStore } from "@/store/mapStore"
import { useAuthModal } from "@/hooks/useAuthModal"
import type { ListWithCount } from "@/lib/lists"
import Link from "next/link"

// Default list definitions with brand colours
const DEFAULT_LISTS = [
  {
    slug: "want-to-try",
    label: "Want to Try",
    status: "want_to_try",
    // Warm orange tint
    bg: "bg-[#FEF3EC]",
    border: "border-[rgba(232,131,74,0.22)]",
    hoverBg: "hover:bg-[#FDE9D9]",
    countColor: "text-[#E8834A]",
    iconBg: "bg-[rgba(232,131,74,0.14)]",
    iconColor: "text-[#E8834A]",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    slug: "visited",
    label: "Visited",
    status: "visited",
    // Soft green tint
    bg: "bg-[#F0FAF5]",
    border: "border-[rgba(58,122,92,0.18)]",
    hoverBg: "hover:bg-[#E2F5EC]",
    countColor: "text-[#3A7A5C]",
    iconBg: "bg-[rgba(58,122,92,0.11)]",
    iconColor: "text-[#3A7A5C]",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  {
    slug: "favourites",
    label: "Favourites",
    status: "favourite",
    // Terracotta tint
    bg: "bg-[#FEF0EC]",
    border: "border-[rgba(212,76,42,0.18)]",
    hoverBg: "hover:bg-[#FAE4DC]",
    countColor: "text-[#D44C2A]",
    iconBg: "bg-[rgba(212,76,42,0.11)]",
    iconColor: "text-[#D44C2A]",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
    ),
  },
]

export default function ListsPage() {
  const router = useRouter()
  const { lists, setLists, addList, updateList, removeList } = useListsStore()
  const openAuthModal = useAuthModal((s) => s.open)
  const [loading, setLoading]     = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [authed, setAuthed]       = useState(false)

  // Use statusMap from map store for default list counts (populated when map is visited)
  const statusMap = useMapStore((s) => s.statusMap)
  const statusCounts = {
    want_to_try: [...statusMap.values()].filter((s) => s === "want_to_try").length,
    visited:     [...statusMap.values()].filter((s) => s === "visited").length,
    favourite:   [...statusMap.values()].filter((s) => s === "favourite").length,
  }

  useEffect(() => {
    setLoading(true)
    fetch("/api/lists")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setLists(data)
          setAuthed(true)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [setLists])

  useEffect(() => {
    import("@/lib/supabase/client").then(({ createClient }) => {
      createClient().auth.getUser().then(({ data: { user } }) => setAuthed(!!user))
    })
  }, [])

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#F5F0E8]">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#D4C8B4] px-4 py-3.5">
        <h1 className="text-lg font-bold tracking-tight text-[#2C2420]">My Lists</h1>
        <button
          onClick={() => authed ? setCreateOpen(true) : openAuthModal()}
          className="flex items-center gap-1.5 rounded-full bg-[#D44C2A] px-3.5 py-1.5 text-xs font-semibold text-white shadow-[0_2px_8px_rgba(212,76,42,0.25)] transition-all hover:bg-[#B83D1E] active:scale-95"
        >
          <Plus className="size-3.5" /> New list
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24 md:pb-4">

        {/* Default lists — color-tinted cards with large count */}
        <div className="grid grid-cols-3 gap-2.5">
          {DEFAULT_LISTS.map(({ slug, label, status, bg, border, hoverBg, countColor, iconBg, iconColor, icon }) => {
            const count = statusCounts[status as keyof typeof statusCounts]
            return (
              <Link
                key={slug}
                href={`/lists/${slug}`}
                className={`flex flex-col items-center gap-2 rounded-2xl border py-4 text-center transition-all active:scale-95 ${bg} ${border} ${hoverBg}`}
              >
                {/* Icon in tinted circle */}
                <div className={`flex size-9 items-center justify-center rounded-[10px] ${iconBg} ${iconColor}`}>
                  {icon}
                </div>
                <span className="text-[10.5px] font-bold leading-tight text-[#2C2420]">{label}</span>
                <span className={`text-xl font-bold leading-none ${count > 0 ? countColor : "text-[#C4BAB0]"}`}>{count}</span>
                <span className="text-[9.5px] text-[#8C7E72]">places</span>
              </Link>
            )
          })}
        </div>

        {/* Custom lists section header */}
        <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#8C7E72]">
          My Lists
        </p>

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        )}


        {/* Custom list cards */}
        <div className="flex flex-col gap-2">
          {lists.map((list) => (
            <ListCard
              key={list.id}
              list={list}
              onClick={() => router.push(`/lists/${list.id}`)}
              onUpdated={(updated) => updateList(updated.id, updated)}
              onDeleted={(id) => removeList(id)}
            />
          ))}

          {/* Dashed "create" card */}
          {!loading && (
            <button
              onClick={() => authed ? setCreateOpen(true) : openAuthModal()}
              className="flex items-center gap-3 rounded-2xl border border-dashed border-[#D4C8B4] px-4 py-3.5 text-left transition-all hover:border-[#D44C2A] hover:bg-[rgba(212,76,42,0.04)] active:scale-[.98]"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-dashed border-[#D4C8B4]">
                <Plus className="size-4 text-[#8C7E72]" />
              </div>
              <span className="text-sm font-semibold text-[#8C7E72]">Create a new list</span>
            </button>
          )}

          {/* Empty state */}
          {!loading && authed && lists.length === 0 && (
            <p className="max-w-xs text-center text-sm text-[#8C7E72] mx-auto pt-2">
              Group restaurants by vibe, occasion, or neighbourhood.
            </p>
          )}
        </div>
      </div>

      <CreateListSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(list: ListWithCount) => { addList(list); setCreateOpen(false) }}
      />
    </div>
  )
}
