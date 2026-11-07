/** True when a key press is meant for a text field, so single-key shortcuts must leave it alone. */
export function typingIn(event: KeyboardEvent): boolean {
  const el = event.target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

/** A bare key: no Ctrl, Cmd, Alt (Shift is allowed, it is part of some characters). */
export function bare(event: KeyboardEvent): boolean {
  return !event.ctrlKey && !event.metaKey && !event.altKey;
}
