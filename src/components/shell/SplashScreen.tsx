"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const ONBOARDED_KEY = "foodraccoon:onboarded";

export function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(ONBOARDED_KEY)) return;
    setVisible(true);
    const fadeTimer = setTimeout(() => setFading(true), 1200);
    const unmountTimer = setTimeout(() => setVisible(false), 1600);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-[#F5F0E8] transition-opacity duration-[400ms]",
        fading ? "pointer-events-none opacity-0" : "opacity-100",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon-512x512.png" alt="FoodRaccoon" width={96} height={96} className="size-24 rounded-3xl shadow-lg" />
    </div>
  );
}
