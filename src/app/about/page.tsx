import { ArrowUpRight, BookOpenText, Bot, BriefcaseBusiness, Database, Eye, FileCheck, Gauge, KeyRound, Layers, Library, Link2, ScanSearch, ShieldCheck, TestTubes, type GlyphIcon } from "@/components/glyphs";
import type { Metadata } from "next";
import { Suspense } from "react";
import { DocShell } from "@/components/DocShell";
import { CREDIT_URL } from "@/components/CreditLink";
import { OnThisPage } from "@/components/OnThisPage";
import { publicStats } from "@/lib/server/stats";
import { monthYear, viewerZone } from "@/lib/server/zone";

export const metadata: Metadata = {
  title: "About · Distill",
  description: "Why Distill exists: summaries where every point links to its sentences and every number is checked against your text.",
};

const sections = [
  { id: "why", title: "Why it exists" },
  { id: "what", title: "What it does" },
  { id: "how", title: "How it is built" },
  { id: "who", title: "Who made it" },
];

const features: { icon: GlyphIcon; tone: string; title: string; text: string }[] = [
  { icon: Link2, tone: "text-brand-strong border-brand-line bg-brand-soft", title: "Linked to the source", text: "Every point shows the sentences it came from, drawn as lines across to your text." },
  { icon: FileCheck, tone: "text-verify border-verify/35 bg-verify-soft", title: "Figures checked", text: "Every number in a summary is checked against its sentences by code, not by the model." },
  { icon: ScanSearch, tone: "text-input border-input/35 bg-input-soft", title: "What was left out", text: "The coverage strip shows which sentences made it into the summary and which did not." },
  { icon: Library, tone: "text-figure border-figure/35 bg-figure-soft", title: "Saved and searchable", text: "Every summary is kept with its source and checks, found again by title, text or a figure." },
  { icon: ShieldCheck, tone: "text-verify border-verify/35 bg-verify-soft", title: "Your text stays yours", text: "Distill gives no one, its owner included, a way to view what you paste or get back. Export it, or delete one summary or your whole account, any time." },
  { icon: Gauge, tone: "text-brand-strong border-brand-line bg-brand-soft", title: "Fair limits", text: "Hourly and daily limits, and spend caps that pause calmly instead of failing." },
];

const stack: { icon: GlyphIcon; label: string; text: string }[] = [
  { icon: Layers, label: "App", text: "Next.js 16, React 19, TypeScript, Tailwind CSS 4" },
  { icon: Database, label: "Data", text: "PostgreSQL 16 with row-level security: every query sees only its own person's rows" },
  { icon: KeyRound, label: "Accounts", text: "Its own sign-in: Argon2id passwords, sessions stored only as a hash" },
  { icon: Bot, label: "AI", text: "Claude Haiku 5.5 through Anthropic's API, streamed point by point" },
  { icon: TestTubes, label: "Tests", text: "Database, unit and browser suites on every push, run against the real container" },
  { icon: Eye, label: "Owner's console", text: "Users, activity, spend, roles and brakes, every action audited; a public demo shows it" },
];

/** The live totals: counted from the database, never anyone's data. */
async function Numbers() {
  const [s, zone] = await Promise.all([publicStats(), viewerZone()]);
  const n = (v: number) => v.toLocaleString("en-US");
  const items: { lead?: string; value: string; label: string }[] = [
    { value: n(s.summaries), label: s.summaries === 1 ? "summary distilled" : "summaries distilled" },
    { value: n(s.words), label: s.words === 1 ? "word read" : "words read" },
    { value: n(s.figures), label: s.figures === 1 ? "figure checked" : "figures checked" },
    ...(s.since ? [{ lead: "Live since", value: monthYear(s.since, zone), label: "" }] : []),
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-border bg-panel px-5 py-3.5">
      <span className="flex items-center gap-1.5 rounded-md border border-verify/35 bg-verify-soft px-2 py-0.5 font-mono text-[10.5px] font-semibold text-verify">
        <span className="size-1.5 rounded-full bg-verify" />
        LIVE
      </span>
      {items.map((i) => (
        <span key={i.lead ?? i.label} className="flex items-baseline gap-1.5">
          {i.lead && <span className="text-[12px] text-brand-strong">{i.lead}</span>}
          <span className="font-mono text-[15px] font-semibold text-text">{i.value}</span>
          {i.label && <span className="text-[12px] text-brand-strong">{i.label}</span>}
        </span>
      ))}
    </div>
  );
}

function Eyebrow({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-strong">
      <span className="h-px w-6 bg-brand-strong" />
      {children}
    </div>
  );
}

export default function AboutPage() {
  return (
    <DocShell page="about" aside={<OnThisPage sections={sections} />}>
      <section id="why" className="scroll-mt-24">
        <Eyebrow>Why it exists</Eyebrow>
        <h1 className="mt-3 text-[46px] font-semibold leading-[1.08] tracking-[-0.025em] max-md:text-[30px]">
          A summary you can&apos;t check
          <br />
          <span className="text-brand-strong">is just another opinion.</span>
        </h1>
        <div className="mt-6 max-w-[640px] space-y-4 text-[15px] leading-[1.75] text-muted">
          <p>
            AI summaries read well, and that is the problem. A confident summary with a wrong number looks exactly like a right one,
            and the only way to know is to read the whole text again, which is what you wanted to avoid.
          </p>
          <p>
            Distill numbers every sentence of your text before Claude sees it, and asks for each point to name the sentences it came
            from. Then it checks every figure in the summary against those sentences, with code, not with another AI.
          </p>
        </div>
        <blockquote className="mt-7 max-w-[640px] border-l-2 border-brand-strong pl-5 text-[21px] font-semibold tracking-[-0.01em] text-balance text-text">
          So you read the summary, and you can still see the source behind every line.
        </blockquote>
        <div className="mt-8">
          <Suspense fallback={<div className="h-[50px] rounded-2xl border border-border bg-panel" />}>
            <Numbers />
          </Suspense>
        </div>
      </section>

      <section id="what" className="mt-16 scroll-mt-24">
        <Eyebrow>What it does</Eyebrow>
        <h2 className="mt-3 text-[32px] font-semibold tracking-[-0.02em] max-md:text-[24px]">
          Short, <span className="text-brand-strong">and traceable.</span>
        </h2>
        <ul className="mt-6 grid grid-cols-2 gap-x-6 max-md:grid-cols-1">
          {features.map(({ icon: Icon, tone, title, text }) => (
            <li key={title} className="flex gap-3.5 border-b border-border py-4">
              <span className={`grid size-9 shrink-0 place-items-center rounded-xl border ${tone}`}>
                <Icon size={17} strokeWidth={2} />
              </span>
              <span>
                <span className="block text-[14px] font-semibold text-text">{title}</span>
                <span className="mt-0.5 block text-[13px] leading-relaxed text-muted">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section id="how" className="mt-16 scroll-mt-24">
        <Eyebrow>How it is built</Eyebrow>
        <h2 className="mt-3 text-[32px] font-semibold tracking-[-0.02em] max-md:text-[24px]">Built like a real product.</h2>
        <ul className="mt-6 divide-y divide-border rounded-2xl border border-border bg-panel">
          {stack.map(({ icon: Icon, label, text }) => (
            <li key={label} className="grid grid-cols-[28px_140px_minmax(0,1fr)] items-center gap-3 px-5 py-3 max-md:grid-cols-[28px_minmax(0,1fr)] max-md:gap-y-1 max-md:px-4 max-md:[&>*:last-child]:col-start-2">
              <Icon size={16} strokeWidth={2} className="text-brand-strong" />
              <span className="text-[13px] font-semibold text-text">{label}</span>
              <span className="text-[13px] text-muted">{text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section id="who" className="mt-16 scroll-mt-24">
        <Eyebrow>Who made it</Eyebrow>
        <h2 className="mt-3 text-[32px] font-semibold tracking-[-0.02em] max-md:text-[24px]">Jerome Badour</h2>
        <p className="mt-4 max-w-[640px] text-[15px] leading-[1.75] text-muted">
          A freelance full-stack developer: web apps, APIs, servers and AI features, built to the same standard as this one. Distill is a
          portfolio project, run for real on its own server. The code is on{" "}
          <a href="https://github.com/jeromebadour/ai-summarizer" target="_blank" rel="noreferrer" className="font-medium text-brand-strong underline decoration-brand-line underline-offset-4 hover:decoration-brand-strong">
            GitHub
          </a>
          , and the owner&apos;s console has a{" "}
          <a href="/demo/admin" className="font-medium text-brand-strong underline decoration-brand-line underline-offset-4 hover:decoration-brand-strong">
            public demo
          </a>
          .
        </p>
        {/* One way to hire him; no prices anywhere on the site (Kami's call). */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a
            href="https://www.upwork.com/freelancers/~018fb626b478552f9f"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-[14px] font-semibold text-on-brand shadow-[0_6px_24px_-8px_var(--brand)] hover:brightness-110"
          >
            <BriefcaseBusiness size={17} strokeWidth={2.1} />
            Work with me on Upwork
            <ArrowUpRight size={15} strokeWidth={2.1} className="opacity-80" />
          </a>
          {/* His site's page about Distill, in its Upwork mode (see CreditLink). */}
          <a
            href={CREDIT_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-brand-line px-4 py-2.5 text-[14px] font-semibold text-brand-strong hover:border-brand-strong hover:text-text"
          >
            <BookOpenText size={17} strokeWidth={2.1} />
            The case study
            <ArrowUpRight size={15} strokeWidth={2.1} className="opacity-80" />
          </a>
        </div>
      </section>
    </DocShell>
  );
}
