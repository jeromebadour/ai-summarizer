/**
 * Theme and Motion on this device. The account holds the choice (so it follows you to another device); this browser
 * keeps a copy in localStorage so the pre-paint script in the root layout applies it before anything shows.
 * "system" means no copy: the device decides.
 */
export type ThemeChoice = "system" | "light" | "dark";
export type MotionChoice = "system" | "full" | "reduced";

function store(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage can be off (private windows, strict settings): the choice still applies to this page.
  }
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function applyTheme(choice: ThemeChoice) {
  store("theme", choice === "system" ? null : choice);
  const light = choice === "light" || (choice === "system" && matchMedia("(prefers-color-scheme: light)").matches);
  document.documentElement.dataset.theme = light ? "light" : "dark";
}

export function applyMotion(choice: MotionChoice) {
  store("motion", choice === "system" ? null : choice);
  if (choice === "system") delete document.documentElement.dataset.motion;
  else document.documentElement.dataset.motion = choice;
}

/** What this browser has now, to compare with the account's choice. */
export function deviceTheme(): ThemeChoice {
  const t = read("theme");
  return t === "light" || t === "dark" ? t : "system";
}

export function deviceMotion(): MotionChoice {
  const m = read("motion");
  return m === "full" || m === "reduced" ? m : "system";
}
