"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, MapPin, X } from "lucide-react";
import { useMapStore } from "@/store/mapStore";
import { cn } from "@/lib/utils";

const ONBOARDED_KEY = "foodraccoon:onboarded";

const primaryBtn =
  "w-full max-w-xs rounded-full bg-[#D44C2A] px-8 py-3 text-base font-semibold text-white shadow-[0_4px_16px_rgba(212,76,42,0.35)] hover:bg-[#C03E1F] active:scale-95 transition-all";

export function OnboardingFlow() {
  const [visible, setVisible] = useState(false);
  const [slide, setSlide] = useState(0);
  const setUserLocation = useMapStore((s) => s.setUserLocation);

  useEffect(() => {
    if (localStorage.getItem(ONBOARDED_KEY)) return;
    setVisible(true);
  }, []);

  function complete() {
    localStorage.setItem(ONBOARDED_KEY, "1");
    setVisible(false);
  }

  function advance() {
    setSlide((s) => s + 1);
  }

  function enableLocation() {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.longitude, pos.coords.latitude]);
        advance();
      },
      () => advance(),
    );
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#F5F0E8]">
      {slide < 2 && (
        <button
          onClick={complete}
          aria-label="Skip onboarding"
          className="absolute right-4 top-4 z-10 flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-[#8C7E72] transition-colors hover:bg-[#EDE6D8] hover:text-[#2C2420]"
        >
          Skip <X className="size-3.5" />
        </button>
      )}

      <div className="relative flex-1 overflow-hidden">
        {/* Slide 0: Welcome */}
        <Slide index={0} current={slide}>
          <div className="flex flex-col items-center justify-center gap-8 px-8 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-512x512.png" alt="FoodRaccoon" className="size-24 rounded-3xl shadow-lg" />
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-[#2C2420]">FoodRaccoon</h1>
              <p className="text-base text-[#8C7E72]">Discover Phnom Penh's best restaurants</p>
            </div>
            <button onClick={advance} className={primaryBtn}>
              Get Started
            </button>
          </div>
        </Slide>

        {/* Slide 1: Location */}
        <Slide index={1} current={slide}>
          <div className="flex flex-col items-center justify-center gap-8 px-8 text-center">
            <div className="flex size-20 items-center justify-center rounded-full bg-[#EDE6D8]">
              <MapPin className="size-9 text-[#D44C2A]" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-[#2C2420]">Find restaurants near you</h2>
              <p className="text-base text-[#8C7E72]">We'll show you what's close and open now</p>
            </div>
            <div className="flex w-full max-w-xs flex-col gap-3">
              <button onClick={enableLocation} className={primaryBtn}>
                Enable Location
              </button>
              <button
                onClick={advance}
                className="text-sm text-[#8C7E72] underline-offset-2 hover:underline"
              >
                Not now
              </button>
            </div>
          </div>
        </Slide>

        {/* Slide 2: Done */}
        <Slide index={2} current={slide}>
          <div className="flex flex-col items-center justify-center gap-8 px-8 text-center">
            <div className="flex size-20 items-center justify-center rounded-full bg-[#EDE6D8]">
              <CheckCircle2 className="size-9 text-[#D44C2A]" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-[#2C2420]">You're all set!</h2>
              <p className="text-base text-[#8C7E72]">
                Start exploring the best restaurants in Phnom Penh
              </p>
            </div>
            <button onClick={complete} className={primaryBtn}>
              Explore the map
            </button>
          </div>
        </Slide>
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-2 pb-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              slide === i ? "w-6 bg-[#D44C2A]" : "w-2 bg-[#D4C8B4]",
            )}
          />
        ))}
      </div>

      <p className="pb-8 text-center text-xs text-[#8C7E72]">
        <a href="/terms" className="hover:text-[#D44C2A] hover:underline">Terms</a>
        {" · "}
        <a href="/privacy" className="hover:text-[#D44C2A] hover:underline">Privacy</a>
      </p>
    </div>
  );
}

function Slide({
  children,
  index,
  current,
}: {
  children: React.ReactNode;
  index: number;
  current: number;
}) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center transition-transform duration-300 ease-in-out"
      style={{ transform: `translateX(${(index - current) * 100}%)` }}
    >
      {children}
    </div>
  );
}
