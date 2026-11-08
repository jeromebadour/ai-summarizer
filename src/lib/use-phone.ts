"use client";

import { useSyncExternalStore } from "react";

const query = "(max-width: 767.98px)";

function subscribe(onChange: () => void) {
  const list = window.matchMedia(query);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

/**
 * Whether the window is phone-sized (the same 768px line as Tailwind's `md`). `initial` is the server's guess from the
 * `vw` cookie, so a phone's first paint already has the phone layout; the browser's own answer takes over after.
 */
export function usePhone(initial: boolean): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => initial);
}
