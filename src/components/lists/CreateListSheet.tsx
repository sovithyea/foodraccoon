"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Globe, Lock } from "lucide-react"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { EmojiPicker } from "./EmojiPicker"
import type { ListWithCount } from "@/lib/lists"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (list: ListWithCount) => void
  editList?: ListWithCount
  onUpdated?: (list: ListWithCount) => void
}

export function CreateListSheet({ open, onOpenChange, onCreated, editList, onUpdated }: Props) {
  const isEdit = !!editList
  const [emoji, setEmoji] = useState(editList?.emoji ?? "📍")
  const [title, setTitle] = useState(editList?.title ?? "")
  const [description, setDescription] = useState(editList?.description ?? "")
  const [isPublic, setIsPublic] = useState(editList?.is_public ?? false)
  const [saving, setSaving] = useState(false)

  function handleOpenChange(nextOpen: boolean) {
    // Always sync form to current editList when opening or closing
    setEmoji(editList?.emoji ?? "📍")
    setTitle(editList?.title ?? "")
    setDescription(editList?.description ?? "")
    setIsPublic(editList?.is_public ?? false)
    onOpenChange(nextOpen)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      if (isEdit && editList) {
        const res = await fetch(`/api/lists/${editList.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, emoji, description, is_public: isPublic }),
        })
        if (!res.ok) throw new Error("Failed to update list")
        const updated = await res.json()
        onUpdated?.({ ...updated, restaurant_count: editList.restaurant_count })
        toast.success("List updated")
      } else {
        const res = await fetch("/api/lists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, emoji, description, is_public: isPublic }),
        })
        if (!res.ok) throw new Error("Failed to create list")
        const created = await res.json()
        onCreated?.(created)
        toast.success("List created")
      }
      onOpenChange(false)
    } catch (err) {
      console.error("[CreateListSheet] save error:", err)
      toast.error(isEdit ? "Failed to update list" : "Failed to create list")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-xl px-4 pb-6">
        <SheetHeader className="px-0">
          <SheetTitle>{isEdit ? "Edit list" : "New list"}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label>Emoji</Label>
            <EmojiPicker value={emoji} onChange={setEmoji} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="list-title">Name</Label>
            <Input
              id="list-title"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 50))}
              placeholder="e.g. Coffee spots"
              required
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground text-right">{title.length}/50</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="list-desc">Description (optional)</Label>
            <Textarea
              id="list-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 200))}
              placeholder="Best cafes in BKK1…"
              rows={2}
              maxLength={200}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsPublic(false)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition-colors ${
                !isPublic
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              <Lock className="size-4" /> Private
            </button>
            <button
              type="button"
              onClick={() => setIsPublic(true)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition-colors ${
                isPublic
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              <Globe className="size-4" /> Public
            </button>
          </div>

          <SheetFooter className="px-0 pt-2">
            <Button type="submit" className="w-full" disabled={!title.trim() || saving}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create list"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
