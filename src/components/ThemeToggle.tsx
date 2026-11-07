"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

function current(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

/** Quick switch in the rail: the glyph shows the theme you will switch to. */
export function ThemeToggle({ className }: { className: string }) {
  const theme = useSyncExternalStore(subscribe, current, () => "dark" as Theme);
  const next: Theme = theme === "dark" ? "light" : "dark";
  const Icon = next === "light" ? Sun : Moon;

  return (
    <button
      type="button"
      aria-label={`Switch to ${next} theme`}
      onClick={() => {
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem("theme", next);
        } catch {}
      }}
      className={className}
    >
      <Icon size={20} strokeWidth={1.75} />
      {next === "light" ? "Light" : "Dark"}
    </button>
  );
}
