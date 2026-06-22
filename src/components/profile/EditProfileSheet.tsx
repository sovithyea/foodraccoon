"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Camera } from "lucide-react"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

const AVATAR_COLORS = ["#D44C2A", "#3A7A5C", "#2C5A8A", "#8A4A2C"]
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial: {
    display_name: string | null
    username: string | null
    bio: string | null
    city: string | null
    avatar_url: string | null
  }
}

export function EditProfileSheet({ open, onOpenChange, initial }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [displayName, setDisplayName] = useState(initial.display_name ?? "")
  const [username, setUsername] = useState(initial.username ?? "")
  const [bio, setBio] = useState(initial.bio ?? "")
  const [city, setCity] = useState(initial.city ?? "Phnom Penh")
  const [avatarUrl, setAvatarUrl] = useState(initial.avatar_url ?? "")
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  function handleOpenChange(next: boolean) {
    if (next) {
      setDisplayName(initial.display_name ?? "")
      setUsername(initial.username ?? "")
      setBio(initial.bio ?? "")
      setCity(initial.city ?? "Phnom Penh")
      setAvatarUrl(initial.avatar_url ?? "")
    }
    onOpenChange(next)
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/profile/avatar", { method: "POST", body: fd })
      if (!res.ok) throw new Error("Upload failed")
      const { url } = await res.json()
      setAvatarUrl(url)
    } catch {
      toast.error("Failed to upload avatar")
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName || null,
          username: username || null,
          bio: bio || null,
          city: city || null,
          avatar_url: avatarUrl || null,
        }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error ?? "Failed to save")
      }
      toast.success("Profile updated")
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile")
    } finally {
      setSaving(false)
    }
  }

  const initials = (displayName || "?").slice(0, 2).toUpperCase()
  const color = avatarColor(displayName || "?")

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-xl px-4 pb-6">
        <SheetHeader className="px-0">
          <SheetTitle>Edit profile</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Avatar */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="relative"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  width={80}
                  height={80}
                  className="size-20 rounded-full object-cover"
                  style={{ boxShadow: `0 0 0 3.5px #EDE6D8, 0 0 0 6px #D44C2A` }}
                />
              ) : (
                <div
                  className="flex size-20 items-center justify-center rounded-full text-2xl font-bold text-white"
                  style={{ backgroundColor: color, boxShadow: `0 0 0 3.5px #EDE6D8, 0 0 0 6px ${color}` }}
                >
                  {initials}
                </div>
              )}
              <div className="absolute bottom-0 right-0 flex size-6 items-center justify-center rounded-full bg-[#D44C2A] text-white shadow">
                <Camera className="size-3.5" />
              </div>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="display-name">Display name</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value.slice(0, 50))}
              placeholder="Your name"
              maxLength={50}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8C7E72]">@</span>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 30))}
                placeholder="username"
                className="pl-7"
                maxLength={30}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 160))}
              placeholder="Tell people about yourself"
              rows={2}
              maxLength={160}
            />
            <p className="text-right text-xs text-muted-foreground">{bio.length}/160</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value.slice(0, 50))}
              placeholder="Phnom Penh"
              maxLength={50}
            />
          </div>

          <SheetFooter className="px-0 pt-2">
            <Button type="submit" className="w-full" disabled={saving || uploading}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
