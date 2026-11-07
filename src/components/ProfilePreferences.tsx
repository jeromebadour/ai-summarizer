"use client";

import {
  Check,
  Keyboard,
  Monitor,
  Moon,
  Palette,
  Sparkles,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Avatar, avatarHue } from "@/components/Avatar";
import { lengthStyles } from "@/components/LengthPicker";
import { avatarColours, type Account, type AvatarColour } from "@/lib/profile";
import type { SummaryLength } from "@/lib/summary";

type Theme = "light" | "dark" | "system";
type Motion = "full" | "reduced" | "system";

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


export function ProfilePreferences({
  account,
  defaultLength,
}: {
  account: Account;
  defaultLength: SummaryLength;
}) {
  const [theme, setTheme] = useState<Theme>("system");
  const [length, setLength] = useState<SummaryLength>(defaultLength);
  const [colour, setColour] = useState<AvatarColour>(account.avatarColour);
  const [motion, setMotion] = useState<Motion>("system");

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
      </section>
      <Shortcuts />
    </div>
  );
}

const shortcuts: { keys: string[]; action: string }[] = [
  { keys: ["Ctrl", "↵"], action: "Distill" },
  { keys: ["Ctrl", "Shift", "C"], action: "Copy the summary" },
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
