"use client"

import { useState } from "react"
import { MoreHorizontal, Globe, Lock, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { CreateListSheet } from "./CreateListSheet"
import type { ListWithCount } from "@/lib/lists"

type Props = {
  list: ListWithCount
  onUpdated: (list: ListWithCount) => void
  onDeleted: (id: string) => void
  onClick: () => void
}

export function ListCard({ list, onUpdated, onDeleted, onClick }: Props) {
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/lists/${list.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      onDeleted(list.id)
      toast.success(`"${list.title}" deleted`)
    } catch {
      toast.error("Failed to delete list")
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  async function handleTogglePublic() {
    const res = await fetch(`/api/lists/${list.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_public: !list.is_public }),
    })
    if (!res.ok) { toast.error("Failed to update"); return }
    const updated = await res.json()
    onUpdated({ ...updated, restaurant_count: list.restaurant_count })
    toast.success(list.is_public ? "Set to private" : "Set to public")
  }

  return (
    <>
      <div className="bg-card border-border flex items-center gap-3 rounded-xl border px-4 py-3">
        <button onClick={onClick} className="flex flex-1 items-center gap-3 text-left min-w-0">
          <span className="text-2xl">{list.emoji ?? "📋"}</span>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{list.title}</p>
            <p className="text-xs text-muted-foreground">
              {list.restaurant_count} {list.restaurant_count === 1 ? "place" : "places"} ·{" "}
              {list.is_public
                ? <><Globe className="inline size-3" /> Public</>
                : <><Lock className="inline size-3" /> Private</>
              }
            </p>
          </div>
        </button>

        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="icon-sm"><MoreHorizontal className="size-4" /></Button>}
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil className="size-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleTogglePublic}>
                  {list.is_public ? <><Lock className="size-4" /> Make private</> : <><Globe className="size-4" /> Make public</>}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="size-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <CreateListSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        editList={list}
        onUpdated={onUpdated}
      />
    </>
  )
}
