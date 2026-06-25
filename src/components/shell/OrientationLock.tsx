"use client";

import { useEffect } from "react";

export function OrientationLock() {
  useEffect(() => {
    try {
      screen.orientation.lock("portrait").catch(() => {});
    } catch {
      // API not supported (iOS Safari)
    }
  }, []);

  return null;
}
