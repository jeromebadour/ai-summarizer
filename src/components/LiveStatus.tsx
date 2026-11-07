"use client";

import { useSyncExternalStore } from "react";
import { StatusPill, type AppStatus } from "@/components/StatusPill";

/**
 * A page's status pill that a client action can update (Preferences saving, then saved), while the page header
 * itself stays a server component. One small store per page load; `report` is what an action calls.
 */
let current: AppStatus = { kind: "ready" };
const listeners = new Set<() => void>();

export function report(status: AppStatus) {
  current = status;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function LiveStatus({ initial }: { initial: AppStatus }) {
  const status = useSyncExternalStore(
    subscribe,
    () => (current.kind === "ready" ? initial : current),
    () => initial,
  );
  return <StatusPill status={status} />;
}
