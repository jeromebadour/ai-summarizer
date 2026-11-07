"use client";

import {
  Check,
  Keyboard,
  Monitor,
  Moon,
  MousePointer2,
  Palette,
  Sparkles,
  Sun,
  Waypoints,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { savePreference, type PreferenceField } from "@/app/actions/account";
import { report } from "@/components/LiveStatus";
import { applyMotion, applyTheme } from "@/lib/appearance";
import { Avatar, avatarHue } from "@/components/Avatar";
import { lengthStyles } from "@/components/LengthPicker";
import { avatarColours, type Account, type AvatarColour } from "@/lib/profile";
import type { SummaryLength } from "@/lib/summary";

type Theme = "light" | "dark" | "system";
type Motion = "full" | "reduced" | "system";
type Links = "always" | "hover";

function Row({
  icon: Icon,
  tone,
  title,
  detail,
  children,
}: {
  icon: LucideIcon;
  tone: string;
  title: string;
  detail: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-6 border-b border-border px-7 py-6 last:border-b-0">
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-panel-raised/60 ${tone}`}
      >
        <Icon size={19} strokeWidth={1.9} />
      </span>
      <div className="w-[360px] shrink-0">
        <h3 className="text-[15px] font-semibold">{title}</h3>
        <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
          {detail}
        </p>
      </div>
      <div className="ml-auto">{children}</div>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { key: T; label: string; icon: LucideIcon }[];
  onChange: (key: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-xl border border-border bg-paper p-1">
      {options.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          aria-pressed={key === value}
          onClick={() => onChange(key)}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-colors ${
            key === value
              ? "bg-brand text-on-brand"
              : "text-muted hover:bg-panel-raised hover:text-text"
          }`}
        >
          <Icon size={15} strokeWidth={2} />
          {label}
        </button>
      ))}
    </div>
  );
}


/** "18:40" on this device's clock, for "Preference saved 18:40". */
const clock = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

/**
 * Each preference saves the moment it is picked (no Save button) and the header pill says so: "Saving", then
 * "Preference saved 18:40", or a calm error if the save failed (the choice on screen goes back with it).
 */
async function persist(field: PreferenceField, value: string, undo: () => void) {
  report({ kind: "working", label: "Saving", elapsedMs: 0 });
  const result = await savePreference(field, value).catch(() => ({ ok: false }));
  if (result.ok) {
    report({ kind: "saved", label: "Preference saved", at: clock() });
  } else {
    undo();
    report({ kind: "error", label: "Couldn't save · try again" });
  }
}

export function ProfilePreferences({
  account,
  defaultLength,
}: {
  account: Account;
  defaultLength: SummaryLength;
}) {
  const [theme, setThemeState] = useState<Theme>(account.theme ?? "system");
  const [length, setLengthState] = useState<SummaryLength>(defaultLength);
  const [colour, setColourState] = useState<AvatarColour>(account.avatarColour);
  const [motion, setMotionState] = useState<Motion>(account.motion ?? "system");
  const [links, setLinksState] = useState<Links>(account.links ?? "always");

  // Theme and Motion apply on this device at once; every preference saves to the account.
  const setTheme = (next: Theme) => {
    const before = theme;
    setThemeState(next);
    applyTheme(next);
    void persist("theme", next, () => {
      setThemeState(before);
      applyTheme(before);
    });
  };
  const setMotion = (next: Motion) => {
    const before = motion;
    setMotionState(next);
    applyMotion(next);
    void persist("motion", next, () => {
      setMotionState(before);
      applyMotion(before);
    });
  };
  const setLinks = (next: Links) => {
    const before = links;
    setLinksState(next);
    void persist("links", next, () => setLinksState(before));
  };
  const setLength = (next: SummaryLength) => {
    const before = length;
    setLengthState(next);
    void persist("default_length", next, () => setLengthState(before));
  };
  const setColour = (next: AvatarColour) => {
    const before = colour;
    setColourState(next);
    void persist("avatar_colour", next, () => setColourState(before));
  };

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-border bg-panel">
        <Row
          icon={Sun}
          tone="text-brand-strong"
          title="Theme"
          detail="System follows your device and switches with it."
        >
          <Segmented
            value={theme}
            onChange={setTheme}
            options={[
              { key: "light", label: "Light", icon: Sun },
              { key: "dark", label: "Dark", icon: Moon },
              { key: "system", label: "System", icon: Monitor },
            ]}
          />
        </Row>

        <Row
          icon={lengthStyles[length].icon}
          tone={
            lengthStyles[length].on
              .split(" ")
              .find((c) => c.startsWith("text-")) ?? ""
          }
          title="Default length"
          detail="Picked for you each time you open Distill."
        >
          <div className="flex gap-1.5 rounded-xl border border-border bg-paper p-1">
            {(Object.keys(lengthStyles) as SummaryLength[]).map((key) => {
              const { icon: Icon, label, on, off } = lengthStyles[key];
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={key === length}
                  onClick={() => setLength(key)}
                  className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 text-[13px] font-semibold ${key === length ? on : `border-transparent ${off}`}`}
                >
                  <Icon size={15} strokeWidth={2.1} />
                  {label}
                </button>
              );
            })}
          </div>
        </Row>

        {!account.isGuest && (
        <Row
          icon={Palette}
          tone="text-figure"
          title="Avatar colour"
          detail="Your initials sit on this colour across the app."
        >
          <div className="flex items-center gap-4">
            <Avatar name={account.name} colour={colour} size={40} />
            <div className="flex gap-2">
              {avatarColours.map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-label={key}
                  aria-pressed={key === colour}
                  onClick={() => setColour(key)}
                  className={`grid size-8 place-items-center rounded-full border-2 transition-transform hover:scale-110 ${key === colour ? "border-text" : "border-transparent"}`}
                  style={{ background: avatarHue[key] }}
                >
                  {key === colour && (
                    <Check
                      size={15}
                      strokeWidth={3}
                      className="text-white"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </Row>
        )}

        <Row
          icon={Sparkles}
          tone="text-input"
          title="Motion"
          detail="Threads drawing in and the live progress. Reduced keeps every state, without the movement."
        >
          <Segmented
            value={motion}
            onChange={setMotion}
            options={[
              { key: "full", label: "Full", icon: Sparkles },
              { key: "reduced", label: "Reduced", icon: Check },
              { key: "system", label: "System", icon: Monitor },
            ]}
          />
        </Row>

        <Row
          icon={Waypoints}
          tone="text-brand-strong"
          title="Links to the source"
          detail="The lines from each point to the sentences it came from. Always draws them all; On hover, only for the point under the mouse."
        >
          <Segmented
            value={links}
            onChange={setLinks}
            options={[
              { key: "always", label: "Always", icon: Waypoints },
              { key: "hover", label: "On hover", icon: MousePointer2 },
            ]}
          />
        </Row>
      </section>
      <Shortcuts />
    </div>
  );
}

const shortcuts: { keys: string[]; action: string }[] = [
  { keys: ["Ctrl", "↵"], action: "Distill" },
  { keys: ["C"], action: "Copy the summary" },
  { keys: ["1 … 9"], action: "Focus a point" },
  { keys: ["/"], action: "Search Saved" },
];

function Shortcuts() {
  return (
    <section className="rounded-2xl border border-border bg-panel px-7 py-5">
      <h3 className="flex items-center gap-2 text-[13px] font-semibold text-input">
        <Keyboard size={16} strokeWidth={2} />
        Keyboard shortcuts
      </h3>
      <ul className="mt-4 grid grid-cols-4 gap-3">
        {shortcuts.map(({ keys, action }) => (
          <li
            key={action}
            className="flex items-center gap-3 rounded-xl border border-border bg-panel-raised/40 px-4 py-3"
          >
            <span className="flex gap-1">
              {keys.map((key) => (
                <kbd
                  key={key}
                  className="rounded-md border border-border-strong bg-paper px-1.5 py-0.5 font-mono text-[11.5px] font-semibold text-text"
                >
                  {key}
                </kbd>
              ))}
            </span>
            <span className="text-[13px] text-muted">{action}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
