import type { AvatarColour } from "@/lib/profile";
import type { Role } from "@/lib/permissions";

/** How the console shows a person everywhere: avatar colour, name, @username, role. Never their text. */
export type Person = {
  id: string;
  name: string;
  username: string;
  avatarColour: AvatarColour;
  role: Role;
};

export type ServerHealth = "comfortable" | "busy" | "strained";

export type AttentionItem = {
  id: string;
  kind: "spend" | "errors" | "server";
  title: string;
  detail: string;
};

export type ActivityKind = "signup" | "guest" | "signin" | "signinFailed" | "upgrade" | "summary" | "delete" | "staff";

export type ActivityEntry = {
  id: string;
  /** Shown as written ("12:28" on the Overview, "Today 12:28" in the log). */
  at: string;
  /** YYYY-MM-DDTHH:MM, the sort key (newest first). */
  when: string;
  kind: ActivityKind;
  /** Null when nobody is signed in (a failed sign-in for an unknown name). */
  person: Person | null;
  /** Metadata only: counts, lengths, codes. */
  detail: string;
  /** Approximate place from the IP (never the IP itself on screen). */
  place?: string;
  /** For a summary: what it cost. Words and tokens only, never the text. */
  usage?: SummaryUsage;
};

/** Tokens and cost are null for a moderator: spend is for owner and admin. */
export type SummaryUsage = { length: "Short" | "Medium" | "Bullets"; words: number; inputTokens: number | null; outputTokens: number | null; costUsd: number | null };

/**
 * Claude's price per million tokens, used for every cost on screen. UNCONFIRMED: placeholder until checked against
 * Anthropic's pricing page (open item in the roadmap). It matches the sample result's telemetry (412 in, 236 out = $0.0016).
 */
/** The model every summary uses, and its price (Anthropic's pricing page, checked 2026-11-07: Haiku 5.5 for prompts up
 * to 100,000 tokens; ours stay far below that, since input is capped at 20,000 characters). */
export const claudeModel = "claude-haiku-5-5";
export const claudePrice = { inputPerMillion: 0.1, outputPerMillion: 0.5 };

export function costOf(inputTokens: number, outputTokens: number): number {
  return (inputTokens * claudePrice.inputPerMillion + outputTokens * claudePrice.outputPerMillion) / 1_000_000;
}

/** "1,240 words · Medium · 0.4¢": the detail line of a summary event. */
export function usageLine(u: SummaryUsage): string {
  const words = `${u.words.toLocaleString("en-US")} words · ${u.length}`;
  return u.costUsd === null ? words : `${words} · ${formatCost(u.costUsd)}`;
}

/**
 * What the server stores or counts. Every "today", "this week" and "this month" figure is derived from the
 * daily series by `overviewFigures`, never stored twice, so two cards can never disagree.
 */
export type AdminOverview = {
  /** The day the console is looking at (YYYY-MM-DD, UTC). */
  today: string;
  users: { registered: number };
  guests: { active: number; today: number; upgradedWeek: number };
  active: { now: number; week: number };
  /**
   * capUsd: the app's own monthly cap; at it, new summaries are refused with a calm notice (owner can change it).
   * workspaceCapUsd: the Anthropic workspace limit set in Anthropic's console, the hard stop above it.
   * dailyCapUsd: the app's own daily cap, so a bad day can't eat the month (the day is UTC, like the limits).
   */
  spend: { capUsd: number; workspaceCapUsd: number; dailyCapUsd: number };
  /** The two switches on the Spend tab; null while running. */
  pauses: { guests: Pause | null; all: Pause | null };
  limitsHit: { today: number; users: number; guests: number };
  /** Oldest first, last 14 days, today last. */
  daily: { signups: number[]; summaries: number[]; spendCents: number[] };
  /** One record for the box: the Overview's glance and the Server tab read the same values. */
  server: {
    health: ServerHealth;
    host: { os: string; kernel: string; region: string; cpus: number; memoryGb: number; diskGb: number; uptime: string };
    /** Percent now; the last value of each series below. */
    cpu: number;
    load: number;
    memory: number;
    disk: number;
    /** One sample an hour, oldest first, the last 48 hours (the collector keeps one a minute; the chart shows hourly). */
    series: { cpu: number[]; load: number[]; memory: number[]; disk: number[] };
    database: { up: boolean; sizeMb: number; connections: number; maxConnections: number; largestTable: { name: string; sizeMb: number } };
    claude: { avgSeconds: number; p95Seconds: number; failedToday: number; lastFailure: { at: string; code: string } | null };
    app: { commit: string; deployedAt: string; next: string; node: string };
    /** Null until backups run on the box: the Backup line and the Server tab stay hidden. */
    backup: {
      last: string;
      restoreTested: string;
      restoreSeconds: number;
      target: string;
      keepDays: number;
      next: string;
      /** Newest first, a short preview; the full list is paged. */
      recent: { id: string; at: string; sizeMb: number; ok: boolean }[];
    } | null;
    security: { firewallPorts: number[]; bannedNow: number; bannedToday: number; updatesPending: number; httpsUntil: string };
    /** Null until the certificate is read on the box. */
    httpsDays: number | null;
  };
  attention: AttentionItem[];
};

/** A pulled switch: when, by whom, why (from settings, kept in the audit log too). */
export type Pause = { since: string; by: Person; reason: string };

export function formatUsd(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

/**
 * Small amounts stay readable: under 10 cents in cents ("0.6¢"), under a tenth of a cent with two decimals ("0.02¢",
 * a typical Haiku summary), above 10 cents in dollars ("$0.43"). Never rounds a real cost down to "0.0¢".
 */
export function formatCost(usd: number): string {
  if (usd === 0) return "0¢";
  const cents = usd * 100;
  if (cents < 0.1) return `${cents < 0.01 ? "<0.01" : cents.toFixed(2)}¢`;
  return usd < 0.1 ? `${cents.toFixed(1)}¢` : formatUsd(usd);
}

const sum = (values: number[]) => values.reduce((total, n) => total + n, 0);

export type OverviewFigures = {
  signups: { today: number; week: number; fortnight: number };
  summaries: { today: number; week: number; fortnight: number };
  spend: { todayUsd: number; weekUsd: number; monthUsd: number; projectedUsd: number; capShare: number };
  claude: { requestsToday: number; failedRate: number };
};

/** Every period figure on the Overview, from the daily series alone. */
export function overviewFigures(o: AdminOverview): OverviewFigures {
  const [year, month, day] = o.today.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const last = (series: number[], days: number) => series.slice(-days);
  // The month so far is today's day number; the 14-day series covers it while day <= 14.
  const monthCents = sum(last(o.daily.spendCents, Math.min(day, o.daily.spendCents.length)));
  const monthUsd = monthCents / 100;
  const summariesToday = o.daily.summaries.at(-1) ?? 0;
  const requestsToday = summariesToday + o.server.claude.failedToday;
  return {
    signups: { today: o.daily.signups.at(-1) ?? 0, week: sum(last(o.daily.signups, 7)), fortnight: sum(o.daily.signups) },
    summaries: { today: summariesToday, week: sum(last(o.daily.summaries, 7)), fortnight: sum(o.daily.summaries) },
    spend: {
      todayUsd: (o.daily.spendCents.at(-1) ?? 0) / 100,
      weekUsd: sum(last(o.daily.spendCents, 7)) / 100,
      monthUsd,
      projectedUsd: (monthUsd / day) * daysInMonth,
      capShare: Math.round((monthUsd / o.spend.capUsd) * 100),
    },
    claude: {
      requestsToday,
      failedRate: requestsToday > 0 ? Math.round((o.server.claude.failedToday / requestsToday) * 1000) / 10 : 0,
    },
  };
}

export type UserStatus = "active" | "guest" | "suspended";
export type Recency = "now" | "today" | "week" | "older";

/** One row of the Users table: identity and metadata only, never what they pasted or got back. */
export type UserRow = {
  person: Person;
  email: string | null;
  joined: string;
  /** YYYY-MM-DD, for sorting and the "new" counts. */
  joinedOn: string;
  /** YYYY-MM-DDTHH:MM: the sort key (newest first). */
  joinedAt: string;
  lastActive: { label: string; recency: Recency };
  summaries: number;
  /** Null for a moderator. */
  costUsd: number | null;
  status: UserStatus;
};

export type SessionRow = { id: string; kind: "desktop" | "laptop" | "phone"; browser: string; os: string; place: string; lastSeen: string };

/** A staff action on one account, from the append-only audit log. Always with the reason the staff member gave. */
export type StaffAction = { id: string; at: string; actor: Person; action: string; reason: string };

/** One user as staff see them: metadata, usage and limits, sessions, staff actions. Never their text. */
export type UserDetail = {
  row: UserRow;
  /** Summaries per day, oldest first, the last 14 days (or since they joined). */
  daily: number[];
  accountDays: number;
  hour: { used: number; limit: number; resetsAt: string | null; resetBy?: { person: Person; at: string } };
  day: { used: number; limit: number } | null;
  flagged: number;
  sessions: SessionRow[];
  staffActions: StaffAction[];
};

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Today 12:28", "Yesterday 09:14" or "Nov 5, 14:20" for a YYYY-MM-DDTHH:MM time, seen from `today`. */
export function whenLabel(when: string, today: string): string {
  const [day, time] = when.split("T");
  if (day === today) return `Today ${time}`;
  const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  if (day === yesterday) return `Yesterday ${time}`;
  const [, m, d] = day.split("-").map(Number);
  return `${monthNames[m - 1]} ${d}, ${time}`;
}

/** The Overview's preview shows account and staff events; summaries and sign-ins have their own tiles and charts. */
export function isNotable(entry: ActivityEntry): boolean {
  return entry.kind !== "summary" && entry.kind !== "signin";
}

/** One staff role held, with who granted it and when (from the audit log). */
export type RoleHolder = { person: Person; since: string; grantedBy: Person | null };
export type RoleChange = { id: string; at: string; actor: Person; action: "granted" | "revoked"; role: Role; target: Person; reason: string };
