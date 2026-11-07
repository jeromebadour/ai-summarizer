import type { Role } from "@/lib/permissions";
import type { SavedItem, SummaryLength } from "@/lib/summary";

export const avatarColours = ["indigo", "teal", "sage", "sand", "plum", "rose", "steel"] as const;
export type AvatarColour = (typeof avatarColours)[number];

export type Account = {
  name: string;
  username: string;
  email: string;
  avatarColour: AvatarColour;
  memberSince: string;
  isGuest: boolean;
  role: Role;
  /** The account's Theme and Motion (signed-in pages only; the rail keeps the device in step). */
  theme?: "system" | "light" | "dark";
  motion?: "system" | "full" | "reduced";
};

export type ProfileStats = {
  summaries: number;
  wordsIn: number;
  wordsOut: number;
  figuresChecked: number;
  /** Summaries with a figure not found in the source (the same count as Saved's Flagged filter). */
  figuresFlagged: number;
  lengthMix: Record<SummaryLength, number>;
  /** Average "% shorter" per length. */
  lengthShorter: Record<SummaryLength, number>;
  /** Summaries per day, oldest first, last 14 days. */
  daily: number[];
  /** Days the account has existed, counting today (1 = created today). */
  accountDays: number;
};

const wordsPerMinute = 230;

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** Reading time saved = time to read the sources minus time to read the summaries. */
export function minutesSaved(stats: Pick<ProfileStats, "wordsIn" | "wordsOut">): number {
  return Math.max(0, Math.round((stats.wordsIn - stats.wordsOut) / wordsPerMinute));
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

export function mostUsedLength(mix: Record<SummaryLength, number>): SummaryLength {
  return (Object.entries(mix) as [SummaryLength, number][]).sort((a, b) => b[1] - a[1])[0][0];
}

export type DeviceKind = "desktop" | "laptop" | "phone";

export type SignedInDevice = {
  id: string;
  kind: DeviceKind;
  browser: string;
  os: string;
  place: string;
  lastActive: string;
  current: boolean;
};

/** Days between two YYYY-MM-DD dates (b minus a). */
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/**
 * Profile numbers computed from the user's own summaries, the way the server computes them from their rows,
 * so the profile can never disagree with the library.
 */
/** What the stats need from each summary: a saved item has it all; the server reads just these columns. */
export type LibraryFacts = Pick<SavedItem, "length" | "wordsIn" | "wordsOut" | "figureStatus" | "date"> & {
  keyFigures: { length: number };
};

export function statsFromLibrary(items: LibraryFacts[], today: string, accountDays: number): ProfileStats {
  const lengths: SummaryLength[] = ["short", "medium", "bullets"];
  const lengthMix = { short: 0, medium: 0, bullets: 0 };
  const shorterSum = { short: 0, medium: 0, bullets: 0 };
  const daily = Array<number>(14).fill(0);
  let wordsIn = 0;
  let wordsOut = 0;
  let figuresChecked = 0;
  let figuresFlagged = 0;
  for (const item of items) {
    lengthMix[item.length] += 1;
    shorterSum[item.length] += item.wordsIn > 0 ? 1 - item.wordsOut / item.wordsIn : 0;
    wordsIn += item.wordsIn;
    wordsOut += item.wordsOut;
    figuresChecked += item.keyFigures.length;
    if (item.figureStatus === "flagged") figuresFlagged += 1;
    const ago = daysBetween(item.date, today);
    if (ago >= 0 && ago < 14) daily[13 - ago] += 1;
  }
  const lengthShorter = { short: 0, medium: 0, bullets: 0 };
  for (const key of lengths) lengthShorter[key] = lengthMix[key] > 0 ? Math.round((shorterSum[key] / lengthMix[key]) * 100) : 0;
  return { summaries: items.length, wordsIn, wordsOut, figuresChecked, figuresFlagged, lengthMix, lengthShorter, daily, accountDays };
}
