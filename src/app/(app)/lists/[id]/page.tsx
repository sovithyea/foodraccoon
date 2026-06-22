"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Link2, MoreHorizontal, Globe, Lock } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ListRestaurantCard } from "@/components/lists/ListRestaurantCard"
import { CreateListSheet } from "@/components/lists/CreateListSheet"
import { useMapStore } from "@/store/mapStore"
import { useListsStore } from "@/store/listsStore"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ListRestaurantDetail, ListWithCount } from "@/lib/lists"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Breadcrumb } from "@/components/ui/breadcrumb"

export default function ListDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const select = useMapStore((s) => s.select)
  const { lists, updateList } = useListsStore()

  const [list, setList] = useState<ListWithCount | null>(null)
  const [items, setItems] = useState<ListRestaurantDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)

  useEffect(() => {
    // Get username for share link
    import("@/lib/supabase/client").then(({ createClient }) => {
      createClient().from("profiles").select("username").single().then(({ data }) => {
        setUsername(data?.username ?? null)
      })
    })

    // Get list metadata from store or fetch
    const storeList = lists.find((l) => l.id === id)
    if (storeList) setList(storeList)

    fetch(`/api/lists/${id}/restaurants`)
      .then((r) => {
        if (!r.ok) { router.push("/lists"); return r.json() }
        return r.json()
      })
      .then((data: ListRestaurantDetail[]) => {
        if (Array.isArray(data)) setItems(data)
        setLoading(false)
      })
      .catch(() => { router.push("/lists") })

    // Fetch list meta if not in store
    if (!storeList) {
      fetch("/api/lists").then(r => r.json()).then((data) => {
        if (Array.isArray(data)) {
          const found = data.find((l: ListWithCount) => l.id === id)
          if (found) setList(found)
        }
      })
    }
  }, [id, lists, router])

  function openOnMap(restaurantId: string) {
    select(restaurantId)
    router.push("/")
  }

  async function confirmRemove() {
    if (!confirmRemoveId) return;
    setRemoving(true);
    const restaurantId = confirmRemoveId;
    setItems((prev) => prev.filter((i) => i.restaurant_id !== restaurantId));
    setConfirmRemoveId(null);
    const res = await fetch(`/api/lists/${id}/restaurants/${restaurantId}`, { method: "DELETE" });
    setRemoving(false);
    if (!res.ok) {
      toast.error("Failed to remove");
      fetch(`/api/lists/${id}/restaurants`).then(r => r.json()).then(setItems);
    } else {
      if (list) updateList(id, { restaurant_count: list.restaurant_count - 1 });
    }
  }

  function handleShare() {
    if (!list || !username) { toast.error("Sign in to share lists"); return }
    if (!list.is_public) { toast.error("Set list to public first"); return }
    const url = `${window.location.origin}/u/${username}/${list.slug}`
    navigator.clipboard.writeText(url)
    toast.success("Link copied")
  }

  if (!list && !loading) return null

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <div className="flex-1 min-w-0">
          {list ? (
            <>
              <Breadcrumb
                variant="dark"
                items={[
                  { label: "Lists", href: "/lists" },
                  { label: [list.emoji, list.title].filter(Boolean).join(" ") },
                ]}
              />
              <p className="mt-0.5 text-xs text-muted-foreground">
                {items.length} {items.length === 1 ? "place" : "places"} ·{" "}
                {list.is_public ? "Public" : "Private"}
              </p>
            </>
          ) : (
            <Skeleton className="h-5 w-40" />
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {list?.is_public && (
            <Button variant="ghost" size="icon-sm" onClick={handleShare}>
              <Link2 className="size-4" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-sm"><MoreHorizontal className="size-4" /></Button>}
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>Edit list</DropdownMenuItem>
              <DropdownMenuItem onClick={async () => {
                if (!list) return
                const res = await fetch(`/api/lists/${id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ is_public: !list.is_public }),
                })
                if (res.ok) {
                  const updated = await res.json()
                  const next: ListWithCount = { ...updated, restaurant_count: list.restaurant_count }
                  setList(next)
                  updateList(id, next)
                  toast.success(list.is_public ? "Set to private" : "Set to public")
                } else {
                  const err = await res.json().catch(() => ({}))
                  console.error("[ListDetail] toggle public error:", err)
                  toast.error("Failed to update list")
                }
              }}>
                {list?.is_public
                  ? <><Lock className="size-4" /> Make private</>
                  : <><Globe className="size-4" /> Make public</>
                }
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loading && [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}

        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <p className="text-sm text-muted-foreground">No restaurants in this list yet.</p>
            <p className="text-xs text-muted-foreground">Add them from the restaurant panel on the map.</p>
          </div>
        )}

        {items.map((item) => (
          <ListRestaurantCard
            key={item.restaurant_id}
            item={item}
            onClick={() => openOnMap(item.restaurant_id)}
            onRemove={() => setConfirmRemoveId(item.restaurant_id)}
          />
        ))}

        {list?.is_public && username && items.length > 0 && (
          <Button variant="outline" className="w-full mt-4" onClick={handleShare}>
            <Link2 className="size-4 mr-2" /> Share list
          </Button>
        )}
      </div>

      {/* Edit list sheet */}
      {list && (
        <CreateListSheet
          open={editOpen}
          onOpenChange={setEditOpen}
          editList={list}
          onUpdated={(updated) => {
            const next: ListWithCount = { ...updated, restaurant_count: list.restaurant_count }
            setList(next)
            updateList(updated.id, next)
          }}
        />
      )}

      {/* Confirm remove dialog */}
      <ConfirmDialog
        open={!!confirmRemoveId}
        onOpenChange={(open) => { if (!open) setConfirmRemoveId(null); }}
        title="Remove from list"
        description={(() => {
          const item = items.find(i => i.restaurant_id === confirmRemoveId);
          return item ? `Remove "${item.restaurant.name}" from this list?` : "Remove this restaurant from the list?";
        })()}
        confirmLabel="Remove"
        onConfirm={confirmRemove}
        loading={removing}
      />
    </div>
  )
}
