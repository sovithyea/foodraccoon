"use client"

import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import { MapPin } from "lucide-react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
import { useTheme } from "next-themes"
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
const PHNOM_PENH: [number, number] = [104.9282, 11.5625]

const DISTRICTS = [
  "BKK1", "BKK2", "BKK3", "Chamkarmon", "Daun Penh", "Riverside",
  "Toul Tom Poung", "Toul Kork", "Sen Sok", "Chroy Changvar",
  "Chbar Ampov", "Mean Chey", "Russei Keo", "Pochentong",
]

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialName?: string
  initialAddress?: string
  initialCuisine?: string
  suggestionId?: string
  onAdded?: () => void
}

export function ManualAddSheet({
  open,
  onOpenChange,
  initialName = "",
  initialAddress = "",
  initialCuisine = "",
  suggestionId,
  onAdded,
}: Props) {
  const { resolvedTheme } = useTheme()
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)

  const [name, setName] = useState(initialName)
  const [address, setAddress] = useState(initialAddress)
  const [district, setDistrict] = useState("")
  const [cuisine, setCuisine] = useState(initialCuisine)
  const [tags, setTags] = useState("")
  const [priceRange, setPriceRange] = useState<number | null>(null)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [saving, setSaving] = useState(false)

  // Reset fields when sheet opens with new data
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form fields when sheet opens
      setName(initialName)
      setAddress(initialAddress)
      setCuisine(initialCuisine)
      setDistrict("")
      setTags("")
      setPriceRange(null)
      setCoords(null)
    }
  }, [open, initialName, initialAddress, initialCuisine])

  // Init mini Mapbox map after sheet is open and container is rendered
  useEffect(() => {
    if (!open || !mapContainerRef.current || mapRef.current) return
    if (!TOKEN) return

    mapboxgl.accessToken = TOKEN

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: resolvedTheme === "dark"
        ? "mapbox://styles/mapbox/dark-v11"
        : "mapbox://styles/mapbox/light-v11",
      center: PHNOM_PENH,
      zoom: 13,
      interactive: true,
    })

    map.on("click", (e) => {
      const { lng, lat } = e.lngLat
      setCoords({ lat, lng })

      if (markerRef.current) {
        markerRef.current.setLngLat([lng, lat])
      } else {
        markerRef.current = new mapboxgl.Marker({ color: "#D44C2A" })
          .setLngLat([lng, lat])
          .addTo(map)
      }
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function handleOpenChange(next: boolean) {
    if (!next) {
      setCoords(null)
    }
    onOpenChange(next)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !coords) return
    setSaving(true)

    const cuisineTypes = cuisine.trim()
      ? cuisine.split(",").map((s) => s.trim()).filter(Boolean)
      : ["International"]
    const tagList = tags.trim()
      ? tags.split(",").map((s) => s.trim()).filter(Boolean)
      : []

    try {
      const res = await fetch("/api/admin/restaurants/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim() || null,
          district: district || null,
          cuisine_type: cuisineTypes,
          tags: tagList,
          price_range: priceRange,
          latitude: coords.lat,
          longitude: coords.lng,
          suggestion_id: suggestionId ?? null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Failed to add restaurant")
      }
      toast.success(`Added: ${name.trim()}`)
      onOpenChange(false)
      onAdded?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add restaurant")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="max-h-[95vh] overflow-y-auto rounded-t-xl px-4 pb-6">
        <SheetHeader className="px-0">
          <SheetTitle>Add restaurant manually</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="manual-name">Name <span className="text-destructive">*</span></Label>
            <Input
              id="manual-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aunty Sok's Noodles"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="manual-address">Address</Label>
            <Input
              id="manual-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Street 163, Toul Tom Poung"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="manual-district">District</Label>
            <select
              id="manual-district"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="bg-background border-input w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">Auto-detect from coordinates</option>
              {DISTRICTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="manual-cuisine">Cuisine type</Label>
            <Input
              id="manual-cuisine"
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
              placeholder="Khmer, Noodles (comma-separated)"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="manual-tags">Tags</Label>
            <Input
              id="manual-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="street food, cheap, open late (comma-separated)"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Price range</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriceRange(priceRange === p ? null : p)}
                  className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                    priceRange === p
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {"$".repeat(p)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              Coordinates <span className="text-destructive">*</span>
              <span className="text-muted-foreground text-xs font-normal">(click map to pin)</span>
            </Label>
            <div
              ref={mapContainerRef}
              className="h-48 w-full overflow-hidden rounded-lg border"
            />
            {coords ? (
              <p className="text-muted-foreground text-xs">
                Lat: {coords.lat.toFixed(6)} · Lng: {coords.lng.toFixed(6)}
              </p>
            ) : (
              <p className="text-muted-foreground text-xs">Click on the map to place a pin</p>
            )}
          </div>

          <SheetFooter className="px-0 pt-2">
            <Button
              type="submit"
              className="w-full"
              disabled={!name.trim() || !coords || saving}
            >
              {saving ? "Adding…" : "Add restaurant"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
