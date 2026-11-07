import { CalendarDays, FileText, Scale, ShieldCheck } from "lucide-react";
import Link from "@/components/NavLink";
import { DocShell, type DocPage } from "@/components/DocShell";
import { OnThisPage } from "@/components/OnThisPage";
import { RichText } from "@/components/RichText";
import type { LegalDoc } from "@/lib/legal";

/** Privacy or Terms: numbered sections and clauses (1, 1.1, 1.2 ...), the version and date, the other document a click away. */
export function LegalPage({ page, doc }: { page: Extract<DocPage, "privacy" | "terms">; doc: LegalDoc }) {
  const other = page === "privacy" ? { href: "/terms", label: "Terms of Use", icon: Scale } : { href: "/privacy", label: "Privacy Policy", icon: ShieldCheck };
  const OtherIcon = other.icon;
  return (
    <DocShell page={page} aside={<OnThisPage sections={doc.sections.map(({ id, title }) => ({ id, title }))} />}>
      <div className="flex items-center gap-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-strong">
        <span className="h-px w-6 bg-brand-strong" />
        {doc.eyebrow}
      </div>
      <h1 className="mt-3 text-[38px] font-semibold leading-tight tracking-[-0.02em]">{doc.title}</h1>
      <p className="mt-3 max-w-[620px] text-[15px] leading-relaxed text-muted">
        {doc.intro} Version {doc.version}, in effect from {doc.effective}.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <span className="flex items-center gap-1.5 rounded-lg border border-border bg-panel px-2.5 py-1 text-[12px] font-semibold text-text">
          <FileText size={13} strokeWidth={2} className="text-brand-strong" />
          Version {doc.version}
        </span>
        <span className="flex items-center gap-1.5 rounded-lg border border-border bg-panel px-2.5 py-1 text-[12px] font-semibold text-text">
          <CalendarDays size={13} strokeWidth={2} className="text-input" />
          In effect from {doc.effective}
        </span>
        <Link href={other.href} className="flex items-center gap-1.5 rounded-lg border border-brand-line px-2.5 py-1 text-[12px] font-semibold text-brand-strong hover:bg-brand-soft">
          <OtherIcon size={13} strokeWidth={2} />
          {other.label}
        </Link>
      </div>

      {doc.sections.map((section, i) => (
        <section key={section.id} id={section.id} className="scroll-mt-24 border-t border-border pt-8 mt-10">
          <h2 className="text-[21px] font-semibold tracking-[-0.01em]">
            <span className="mr-2 font-mono text-[17px] text-brand-strong">{i + 1}.</span>
            {section.title}
          </h2>
          <ol className="mt-4 space-y-3.5">
            {section.clauses.map((clause, j) => (
              <li key={j} className="grid grid-cols-[44px_minmax(0,1fr)] gap-2">
                <span className="pt-0.5 font-mono text-[11.5px] text-faint">
                  {i + 1}.{j + 1}
                </span>
                <p className="max-w-[640px] text-[14.5px] font-[450] leading-[1.7] text-text">
                  <RichText text={clause} />
                </p>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </DocShell>
  );
}
