"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { applyTheme } from "@/lib/appearance";

type Theme = "light" | "dark";

function current(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

/**
 * Quick switch in the rail: the glyph shows the theme you will switch to. Signed in, the choice is also saved to the
 * account (`save` is a server action passed in by the rail); the public demo passes none, so it saves nothing.
 */
export function ThemeToggle({ className, save }: { className: string; save?: (field: "theme", value: string) => Promise<unknown> }) {
  const theme = useSyncExternalStore(subscribe, current, () => "dark" as Theme);
  const next: Theme = theme === "dark" ? "light" : "dark";
  const Icon = next === "light" ? Sun : Moon;

  return (
    <button
      type="button"
      aria-label={`Switch to ${next} theme`}
      onClick={() => {
        applyTheme(next);
        void save?.("theme", next);
      }}
      className={className}
    >
      <Icon size={20} strokeWidth={1.75} />
      {next === "light" ? "Light" : "Dark"}
    </button>
  );
}
