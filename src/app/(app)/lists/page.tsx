"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Clock, CheckCircle, Heart, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ListCard } from "@/components/lists/ListCard"
import { CreateListSheet } from "@/components/lists/CreateListSheet"
import { useListsStore } from "@/store/listsStore"
import type { ListWithCount } from "@/lib/lists"
import Link from "next/link"

const DEFAULT_LISTS: { slug: string; label: string; Icon: LucideIcon }[] = [
  { slug: "want-to-try", label: "Want to Try", Icon: Clock },
  { slug: "visited",     label: "Visited",     Icon: CheckCircle },
  { slug: "favourites",  label: "Favourites",  Icon: Heart },
]

export default function ListsPage() {
  const router = useRouter()
  const { lists, setLists, addList, updateList, removeList } = useListsStore()
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch("/api/lists")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setLists(data)
          setAuthed(data.length >= 0) // got a valid response = authed
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [setLists])

  useEffect(() => {
    // Also check auth separately for the empty state
    import("@/lib/supabase/client").then(({ createClient }) => {
      createClient().auth.getUser().then(({ data: { user } }) => setAuthed(!!user))
    })
  }, [])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h1 className="text-base font-semibold">My Lists</h1>
        {authed && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> New list
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* Default lists */}
        <div className="grid grid-cols-3 gap-2">
          {DEFAULT_LISTS.map(({ slug, label, Icon }) => (
            <Link
              key={slug}
              href={`/lists/${slug}`}
              className="bg-card border-border flex flex-col items-center gap-1.5 rounded-xl border py-3 text-center hover:bg-accent/30 transition-colors"
            >
              <Icon className="size-4 text-muted-foreground" />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          ))}
        </div>

        {/* Custom lists */}
        {loading && (
          <div className="space-y-2 pt-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        )}

        {!loading && authed && lists.length === 0 && (
          <p className="text-center text-sm text-muted-foreground pt-6 max-w-xs mx-auto">
            Create your first list — group restaurants by vibe, occasion, or neighbourhood.
          </p>
        )}

        {!loading && !authed && (
          <p className="text-center text-sm text-muted-foreground pt-4">
            <Link href="/login" className="text-primary underline underline-offset-2">Sign in</Link>
            {" "}to create and manage custom lists.
          </p>
        )}

        {lists.map((list) => (
          <ListCard
            key={list.id}
            list={list}
            onClick={() => router.push(`/lists/${list.id}`)}
            onUpdated={(updated) => updateList(updated.id, updated)}
            onDeleted={(id) => removeList(id)}
          />
        ))}
      </div>

      <CreateListSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(list) => { addList(list); setCreateOpen(false) }}
      />
    </div>
  )
}
