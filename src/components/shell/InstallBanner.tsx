"use client";

import { useEffect, useState } from "react";
import { Share2, Download, X } from "lucide-react";

const DISMISS_KEY = "foodraccoon:install-dismissed";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    return Date.now() - parseInt(raw, 10) < SNOOZE_MS;
  } catch {
    return false;
  }
}

function saveDismiss() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {}
}

function clearDismiss() {
  try {
    localStorage.removeItem(DISMISS_KEY);
  } catch {}
}

export function InstallBanner() {
  const [platform, setPlatform] = useState<"ios" | "android" | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (isDismissed()) return;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIos) {
      setPlatform("ios");
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setPlatform("android");
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = () => {
      clearDismiss();
      setPlatform(null);
      setInstallPrompt(null);
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  function dismiss() {
    saveDismiss();
    setPlatform(null);
  }

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setPlatform(null);
    setInstallPrompt(null);
  }

  if (!platform) return null;

  return (
    <div
      className="fixed inset-x-0 z-30 flex items-center gap-3 border-t border-[#D4C8B4] bg-[#EDE6D8] px-4 py-2.5 md:hidden"
      style={{ bottom: "calc(max(8px, env(safe-area-inset-bottom)) + 68px)" }}
    >
      <div className="flex flex-1 items-center gap-2.5 min-w-0">
        {platform === "ios" ? (
          <Share2 className="size-4 shrink-0 text-[#D44C2A]" />
        ) : (
          <Download className="size-4 shrink-0 text-[#D44C2A]" />
        )}
        <p className="truncate text-xs text-[#2C2420]">
          {platform === "ios"
            ? "Tap Share then “Add to Home Screen”"
            : "Install Foodraccoon for quick access"}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {platform === "android" && (
          <button
            onClick={install}
            className="rounded-lg bg-[#D44C2A] px-3 py-1 text-xs font-semibold text-white"
          >
            Install
          </button>
        )}
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="rounded-full p-1 text-[#8C7E72] hover:bg-[#D4C8B4]"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
