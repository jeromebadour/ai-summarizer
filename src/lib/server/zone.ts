import "server-only";
import { cookies } from "next/headers";

/** The viewer's IANA time zone from the `tz` cookie (set before first paint), or UTC if missing or not a real zone. */
export async function viewerZone(): Promise<string> {
  const raw = (await cookies()).get("tz")?.value;
  if (!raw || raw.length > 64) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: raw });
    return raw;
  } catch {
    return "UTC";
  }
}

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Parts of a moment as seen in `zone`. */
export function partsIn(when: Date, zone: string): { day: string; time: string; year: number; month: number; date: number } {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(when);
  const get = (type: string) => f.find((p) => p.type === type)?.value ?? "";
  const day = `${get("year")}-${get("month")}-${get("day")}`;
  return { day, time: `${get("hour")}:${get("minute")}`, year: Number(get("year")), month: Number(get("month")), date: Number(get("day")) };
}

/** "Oct 2026": the month an account started, in the viewer's zone. */
export function monthYear(when: Date, zone: string): string {
  const p = partsIn(when, zone);
  return `${monthNames[p.month - 1]} ${p.year}`;
}

/** "Now", "12 min ago", "3 h ago", "Yesterday", "Nov 3": how long ago, for device lists and "last changed". */
export function agoLabel(when: Date, now: Date, zone: string): string {
  const minutes = Math.floor((now.getTime() - when.getTime()) / 60_000);
  if (minutes < 2) return "Now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)} h ago`;
  const days = Math.floor(minutes / (60 * 24));
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 35) return `${Math.floor(days / 7)} ${days < 14 ? "week" : "weeks"} ago`;
  const p = partsIn(when, zone);
  return p.year === partsIn(now, zone).year ? `${monthNames[p.month - 1]} ${p.date}` : `${monthNames[p.month - 1]} ${p.date}, ${p.year}`;
}
