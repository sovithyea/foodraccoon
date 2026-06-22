"use client";

import { useEffect, useRef, useState } from "react";
import { Layers } from "lucide-react";
import { useMapStore } from "@/store/mapStore";
import { MAP_STYLES } from "./RestaurantMap";
import { cn } from "@/lib/utils";

// ─── Mini-map thumbnail visuals ──────────────────────────────────────────────
// Each thumbnail is a 56×44px CSS-drawn preview of the map style.
// No images or external assets needed.

function LightThumb() {
  return (
    <div className="relative size-full" style={{ background: "#D6CFCA" }}>
      {/* Roads */}
      <div className="absolute inset-x-0" style={{ top: "42%", height: 4, background: "rgba(255,255,255,0.72)" }} />
      <div className="absolute inset-y-0" style={{ left: "47%", width: 4, background: "rgba(255,255,255,0.72)" }} />
      {/* Buildings */}
      <div className="absolute rounded-[1px]" style={{ top: "10%", left: "5%",  width: 18, height: 12, background: "#B8B0A8" }} />
      <div className="absolute rounded-[1px]" style={{ top: "10%", left: "54%", width: 14, height: 16, background: "#B8B0A8" }} />
      <div className="absolute rounded-[1px]" style={{ top: "50%", left: "5%",  width: 20, height: 11, background: "#B8B0A8" }} />
      {/* Park */}
      <div className="absolute rounded-[2px]" style={{ top: "18%", left: "24%", width: 12, height: 9,  background: "#9DBE90", opacity: 0.8 }} />
    </div>
  );
}

function DarkThumb() {
  return (
    <div className="relative size-full" style={{ background: "#1A1714" }}>
      <div className="absolute inset-x-0" style={{ top: "42%", height: 4, background: "rgba(255,255,255,0.12)" }} />
      <div className="absolute inset-y-0" style={{ left: "47%", width: 4, background: "rgba(255,255,255,0.12)" }} />
      <div className="absolute rounded-[1px]" style={{ top: "10%", left: "5%",  width: 18, height: 12, background: "#2A2724" }} />
      <div className="absolute rounded-[1px]" style={{ top: "10%", left: "54%", width: 14, height: 16, background: "#2A2724" }} />
      <div className="absolute rounded-[1px]" style={{ top: "50%", left: "5%",  width: 20, height: 11, background: "#2A2724" }} />
      {/* Markers glow in dark */}
      <div className="absolute rounded-full" style={{ top: "14%", left: "8%",  width: 5, height: 5, background: "#D44C2A" }} />
      <div className="absolute rounded-full" style={{ top: "54%", left: "30%", width: 5, height: 5, background: "#E8834A" }} />
    </div>
  );
}

function StreetsThumb() {
  return (
    <div className="relative size-full" style={{ background: "#F0ECE4" }}>
      {/* Yellow arterial roads */}
      <div className="absolute inset-x-0" style={{ top: "41%", height: 5, background: "#FDEFC4" }} />
      <div className="absolute inset-y-0" style={{ left: "47%", width: 5, background: "#FDEFC4" }} />
      <div className="absolute rounded-[1px]" style={{ top: "10%", left: "5%",  width: 18, height: 12, background: "#DDD8CF" }} />
      <div className="absolute rounded-[1px]" style={{ top: "10%", left: "54%", width: 14, height: 16, background: "#DDD8CF" }} />
      <div className="absolute rounded-[2px]" style={{ top: "20%", left: "24%", width: 10, height: 8,  background: "#B6D49A", opacity: 0.9 }} />
      <div className="absolute rounded-full" style={{ top: "14%", left: "8%",  width: 5, height: 5, background: "#D44C2A" }} />
    </div>
  );
}

function HybridThumb() {
  return (
    <div
      className="relative size-full"
      style={{ background: "linear-gradient(135deg,#2C4A28 0%,#3C5E32 40%,#2A4038 70%,#384E2E 100%)" }}
    >
      <div className="absolute inset-x-0" style={{ top: "42%", height: 4, background: "rgba(255,255,255,0.28)" }} />
      <div className="absolute inset-y-0" style={{ left: "47%", width: 4, background: "rgba(255,255,255,0.28)" }} />
      <div className="absolute rounded-[1px]" style={{ top: "10%", left: "5%",  width: 18, height: 12, background: "rgba(80,70,60,0.6)" }} />
      <div className="absolute rounded-[1px]" style={{ top: "10%", left: "54%", width: 14, height: 16, background: "rgba(80,70,60,0.6)" }} />
      {/* Gold markers pop on satellite */}
      <div className="absolute rounded-full" style={{ top: "14%", left: "8%",  width: 6, height: 6, background: "#FFD700" }} />
      <div className="absolute rounded-full" style={{ top: "55%", left: "28%", width: 6, height: 6, background: "#FFD700" }} />
    </div>
  );
}

const THUMBNAILS: Record<string, React.ReactNode> = {
  light:     <LightThumb />,
  dark:      <DarkThumb />,
  streets:   <StreetsThumb />,
  satellite: <HybridThumb />,
};

// ─── Component ────────────────────────────────────────────────────────────────

export function MapStylePicker() {
  const mapStyleId    = useMapStore((s) => s.mapStyleId);
  const setMapStyleId = useMapStore((s) => s.setMapStyleId);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dismiss on outside click
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Dismiss on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="absolute z-10 flex flex-col items-end gap-2"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 150px)", right: "16px" }}
    >
      {/* ── Thumbnail strip ── */}
      {open && (
        <div
          className={cn(
            // Slide up + fade in using tw-animate-css utilities
            "animate-in fade-in slide-in-from-bottom-2 duration-200",
            "flex gap-2 rounded-2xl p-2.5",
            "border border-[#D4C8B4]/70 bg-[#F5F0E8]/96 shadow-xl backdrop-blur-md",
          )}
        >
          {MAP_STYLES.map(({ id, label }) => {
            const isActive = mapStyleId === id;
            return (
              <button
                key={id}
                onClick={() => {
                  // Tap active style → reset to auto (follows theme)
                  setMapStyleId(mapStyleId === id ? null : id);
                  setOpen(false);
                }}
                className="group flex flex-col items-center gap-1.5 focus-visible:outline-none"
                aria-pressed={isActive}
                aria-label={label}
              >
                {/* Thumbnail card */}
                <div
                  className={cn(
                    "h-11 w-14 overflow-hidden rounded-[10px] transition-all duration-150",
                    isActive
                      ? "ring-[2.5px] ring-[#D44C2A] ring-offset-1 ring-offset-[#F5F0E8]"
                      : "ring-1 ring-[#D4C8B4]/60 group-hover:ring-[#D44C2A]/50",
                  )}
                >
                  {THUMBNAILS[id]}
                </div>

                {/* Label */}
                <span
                  className={cn(
                    "text-[10px] transition-colors",
                    isActive
                      ? "font-bold text-[#D44C2A]"
                      : "font-medium text-[#8C7E72] group-hover:text-[#2C2420]",
                  )}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Toggle button ── */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle map style picker"
        aria-expanded={open}
        className={cn(
          // 44px — meets touch target minimum
          "inline-flex size-11 items-center justify-center rounded-xl",
          "shadow-md backdrop-blur-sm transition-all duration-200",
          "active:scale-90",
          open
            ? [
                "border-transparent bg-[#D44C2A] text-white",
                "shadow-[0_4px_16px_rgba(212,76,42,0.40)]",
              ]
            : [
                "border border-[#D4C8B4]/60 bg-[#F5F0E8]/95 text-[#2C2420]",
                "hover:bg-[#F5F0E8] hover:shadow-lg",
              ],
        )}
      >
        <Layers size={18} />
      </button>
    </div>
  );
}
