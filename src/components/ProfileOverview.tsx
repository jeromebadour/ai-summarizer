import {
  CalendarDays,
  ChartColumn,
  Clock3,
  FileText,
  Gauge,
  Mail,
  ShieldCheck,
  TriangleExclamationPoint,
  Type,
  UserPen,
  UserRound,
  UserRoundPlus,
} from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { DayBars } from "@/components/DayBars";
import { EmptyLibrary } from "@/components/EmptyLibrary";
import { StatTile } from "@/components/StatTile";
import { lengthStyles } from "@/components/LengthPicker";
import { formatDuration, minutesSaved, mostUsedLength, type Account, type ProfileStats } from "@/lib/profile";
import type { SummaryLength } from "@/lib/summary";

/** Only the days the account has existed: a new account never shows a row of empty days. */
function Activity({ daily: lastFourteen, accountDays }: { daily: number[]; accountDays: number }) {
  const days = Math.max(1, Math.min(lastFourteen.length, accountDays));
  const daily = lastFourteen.slice(-days);
  const total = daily.reduce((sum, n) => sum + n, 0);
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-panel p-5">
      <div className="flex items-center gap-2 text-[12.5px] font-semibold text-brand-strong">
        <ChartColumn size={16} strokeWidth={2} />
        {days === 1 ? "Today" : `Last ${days} days`}
        <span className="ml-auto font-mono text-[11.5px] font-medium text-muted">{total} summaries</span>
      </div>
      <DayBars values={daily} label="Summaries per day" bar="bg-brand" today="bg-brand-strong" />
    </div>
  );
}

function LengthMix({ mix, shorter }: { mix: Record<SummaryLength, number>; shorter: Record<SummaryLength, number> }) {
  const keys = Object.keys(mix) as SummaryLength[];
  const total = keys.reduce((sum, key) => sum + mix[key], 0);
  const top = mostUsedLength(mix);
  // "Most used" only when one length really leads: a tie has no favourite.
  const leads = keys.every((key) => key === top || mix[key] < mix[top]);
  const favourite = lengthStyles[top];
  const FavouriteIcon = favourite.icon;
  const bar: Record<SummaryLength, string> = { short: "bg-short", medium: "bg-medium", bullets: "bg-bullets" };

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-panel p-5">
      <div className="flex items-center gap-2 text-[12.5px] font-semibold text-muted">
        <span className="text-text">Length mix</span>
        {leads && (
          <span className={`ml-auto flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11.5px] ${favourite.on}`}>
            <FavouriteIcon size={13} strokeWidth={2.2} />
            Most used: {favourite.label}
          </span>
        )}
      </div>
      <div className="mt-5 flex h-3 gap-1 overflow-hidden rounded-full">
        {keys.map((key) => (
          <span key={key} className={`h-full ${bar[key]}`} style={{ flexGrow: mix[key] }} />
        ))}
      </div>
      <ul className="mt-5 flex flex-1 flex-col justify-around">
        {keys.map((key) => {
          const { icon: Icon, label, on } = lengthStyles[key];
          return (
            <li key={key} className="flex items-center gap-3">
              <span className={`grid size-8 place-items-center rounded-lg border ${on}`}>
                <Icon size={15} strokeWidth={2.2} />
              </span>
              <span>
                <span className="block text-[13.5px] font-semibold">{label}</span>
                {mix[key] > 0 ? (
                  <span className="font-mono text-[11px] text-brand-strong">{shorter[key]}% shorter on average</span>
                ) : (
                  <span className="font-mono text-[11px] text-faint">Not used yet</span>
                )}
              </span>
              <span className="ml-auto font-mono text-[12.5px] text-muted">
                {mix[key]} · {total > 0 ? Math.round((mix[key] / total) * 100) : 0}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function GuestCard({ account }: { account: Account }) {
  return (
    <section className="relative flex items-center gap-6 overflow-hidden rounded-2xl border border-input/30 bg-panel px-7 py-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-input/70 to-transparent" aria-hidden />
      <span className="grid size-[76px] shrink-0 place-items-center rounded-full border border-input/40 bg-input-soft text-input">
        <UserRound size={34} strokeWidth={1.7} />
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <h2 className="text-[24px] font-semibold tracking-[-0.01em]">Guest</h2>
          <span className="rounded-md border border-input/35 bg-input-soft px-2 py-0.5 text-[12px] font-semibold text-input">Guest session</span>
        </div>
        <p className="mt-1.5 max-w-[560px] text-[13.5px] leading-relaxed text-muted">
          Your summaries are kept with this browser only. Create an account to keep them anywhere, with 10 summaries an
          hour instead of 5.
        </p>
        <div className="mt-2.5 flex items-center gap-5 text-[12.5px] text-muted">
          <span className="flex items-center gap-1.5">
            <CalendarDays size={14} strokeWidth={2} className="text-input" />
            Started {account.memberSince}
          </span>
          <span className="flex items-center gap-1.5">
            <Gauge size={14} strokeWidth={2} className="text-input" />5 summaries an hour
          </span>
        </div>
      </div>
      <Link
        href="/profile?dialog=keep"
        className="ml-auto flex items-center gap-2.5 self-center rounded-xl bg-brand py-2.5 pl-4 pr-5 text-[14px] font-semibold text-on-brand shadow-[0_6px_24px_-8px_var(--brand)] hover:brightness-110"
      >
        <UserRoundPlus size={19} strokeWidth={2} />
        Keep your summaries
      </Link>
    </section>
  );
}

export function ProfileOverview({ account, stats }: { account: Account; stats: ProfileStats }) {
  const shorter = stats.wordsIn > 0 ? Math.round((1 - stats.wordsOut / stats.wordsIn) * 100) : 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      {account.isGuest ? (
        <GuestCard account={account} />
      ) : (
      <section className="relative flex items-center gap-6 overflow-hidden rounded-2xl border border-border bg-panel px-7 py-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-strong/60 to-transparent" aria-hidden />
        <Avatar name={account.name} colour={account.avatarColour} size={76} />
        <div className="min-w-0">
          <h2 className="text-[24px] font-semibold tracking-[-0.01em]">{account.name}</h2>
          <div className="mt-1 font-mono text-[13px] text-brand-strong">@{account.username}</div>
          <div className="mt-2.5 flex items-center gap-5 text-[12.5px] text-muted">
            <span className="flex items-center gap-1.5">
              <Mail size={14} strokeWidth={2} className="text-input" />
              {account.email}
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays size={14} strokeWidth={2} className="text-input" />
              Member since {account.memberSince}
            </span>
          </div>
        </div>
        <Link href="/profile?dialog=edit" className="ml-auto flex items-center gap-2.5 self-start rounded-xl border border-brand-line py-2 pl-3 pr-4 text-[13.5px] font-semibold text-text hover:bg-brand-soft">
          <UserPen size={19} strokeWidth={1.9} className="text-brand-strong" />
          Edit
        </Link>
      </section>
      )}

      {stats.summaries === 0 ? (
        // A new account has no numbers yet: one calm invitation instead of a wall of zeros and empty charts.
        <EmptyLibrary
          title="No numbers yet"
          detail="Words distilled, reading time saved and figures checked fill in from the summaries you make."
        />
      ) : (
      <>
      <div className="grid grid-cols-4 gap-5">
        <StatTile icon={FileText} tone="text-brand-strong" label="Summaries" value={String(stats.summaries)} note={`${stats.lengthMix.medium} medium · ${stats.lengthMix.short} short · ${stats.lengthMix.bullets} bullets`} />
        <StatTile
          icon={Type}
          tone="text-figure"
          label="Words distilled"
          value={stats.wordsIn.toLocaleString("en-US")}
          note={
            <>
              into {stats.wordsOut.toLocaleString("en-US")} · <span className="text-brand-strong">{shorter}% shorter</span>
            </>
          }
        />
        <StatTile icon={Clock3} tone="text-input" label="Reading time saved" value={formatDuration(minutesSaved(stats))} note="at 230 words a minute" />
        <StatTile
          icon={ShieldCheck}
          tone="text-verify"
          label="Figures checked"
          value={String(stats.figuresChecked)}
          note={
            stats.figuresFlagged > 0 ? (
              <span className="flex items-center gap-1.5 text-flag">
                <TriangleExclamationPoint size={12} strokeWidth={2.2} />
                {stats.figuresFlagged} {stats.figuresFlagged === 1 ? "summary" : "summaries"} flagged
              </span>
            ) : (
              "none flagged"
            )
          }
        />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1.4fr_1fr] gap-5">
        <Activity daily={stats.daily} accountDays={stats.accountDays} />
        <LengthMix mix={stats.lengthMix} shorter={stats.lengthShorter} />
      </div>
      </>
      )}
    </div>
  );
}
