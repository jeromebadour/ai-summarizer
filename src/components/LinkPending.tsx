"use client";

import { useLinkStatus } from "next/link";

/**
 * Marks its link the moment it is pressed, before the server answers, so the press shows at once: the CSS in
 * globals.css and the tab and rail styles key on `[data-pending]`. Renders nothing visible.
 */
export function LinkPending() {
  const { pending } = useLinkStatus();
  return pending ? <span data-pending hidden /> : null;
}
