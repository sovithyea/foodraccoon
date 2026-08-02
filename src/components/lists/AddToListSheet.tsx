"use client"

import { useEffect, useState } from "react"
import { Plus, Check } from "lucide-react"
import { toast } from "sonner"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CreateListSheet } from "./CreateListSheet"
import { useListsStore } from "@/store/listsStore"
import type { ListWithMembership } from "@/lib/lists"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  restaurantId: string
}

export function AddToListSheet({ open, onOpenChange, restaurantId }: Props) {
  const { addList } = useListsStore()
  const [lists, setLists] = useState<ListWithMembership[]>([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-open loading flag
    setLoading(true)
    fetch(`/api/lists?restaurantId=${restaurantId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setLists(data as ListWithMembership[])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [open, restaurantId])

  async function toggle(list: ListWithMembership) {
    // Optimistic
    setLists((prev) =>
      prev.map((l) => (l.id === list.id ? { ...l, contains: !l.contains } : l))
    )

    if (list.contains) {
      const res = await fetch(`/api/lists/${list.id}/restaurants/${restaurantId}`, { method: "DELETE" })
      if (!res.ok) {
        setLists((prev) => prev.map((l) => (l.id === list.id ? { ...l, contains: true } : l)))
        toast.error("Failed to remove from list")
      }
    } else {
      const res = await fetch(`/api/lists/${list.id}/restaurants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId }),
      })
      if (!res.ok) {
        setLists((prev) => prev.map((l) => (l.id === list.id ? { ...l, contains: false } : l)))
        toast.error("Failed to add to list")
      }
    }
  }

  return (
    <>
      <Sheet open={open && !createOpen} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto rounded-t-xl px-4 pb-6">
          <SheetHeader className="px-0">
            <SheetTitle>Add to list</SheetTitle>
          </SheetHeader>

          <div className="mt-3 space-y-1">
            {loading && [...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}

            {!loading && lists.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No lists yet. Create one below.
              </p>
            )}

            {lists.map((list) => (
              <button
                key={list.id}
                onClick={() => toggle(list)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent text-left transition-colors"
              >
                <span className="text-xl">{list.emoji ?? "📋"}</span>
                <span className="flex-1 text-sm font-medium">{list.title}</span>
                <span className={`flex size-5 items-center justify-center rounded border transition-colors ${
                  list.contains ? "border-primary bg-primary text-primary-foreground" : "border-border"
                }`}>
                  {list.contains && <Check className="size-3" />}
                </span>
              </button>
            ))}

            <button
              onClick={() => setCreateOpen(true)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-primary hover:bg-accent transition-colors"
            >
              <Plus className="size-4" /> Create new list
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <CreateListSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(newList) => {
          addList(newList)
          setLists((prev) => [...prev, { ...newList, contains: false }])
          setCreateOpen(false)
        }}
      />
    </>
  )
}
