"use client";

import { useEffect } from "react";
import { applyMotion, applyTheme, deviceMotion, deviceTheme, type MotionChoice, type ThemeChoice } from "@/lib/appearance";

/**
 * The account's Theme and Motion win over what this browser remembers: on another device, or after a change made
 * elsewhere, the page takes the account's choice the moment it loads. Renders nothing.
 */
export function AppearanceSync({ theme, motion }: { theme: ThemeChoice; motion: MotionChoice }) {
  useEffect(() => {
    if (deviceTheme() !== theme) applyTheme(theme);
    if (deviceMotion() !== motion) applyMotion(motion);
  }, [theme, motion]);
  return null;
}
