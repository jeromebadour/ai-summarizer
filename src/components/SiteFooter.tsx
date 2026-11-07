import { CodeXml, Eye, FlaskConical, Info, Library, Scale, ShieldCheck, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";

const columns: { title: string; links: { href: string; label: string; icon: LucideIcon; external?: boolean }[] }[] = [
  {
    title: "Distill",
    links: [
      { href: "/", label: "Open Distill", icon: FlaskConical },
      { href: "/saved", label: "Saved", icon: Library },
      { href: "/demo/admin", label: "Admin demo", icon: Eye },
    ],
  },
  {
    title: "About",
    links: [
      { href: "/about", label: "About Distill", icon: Info },
      { href: "/privacy", label: "Privacy Policy", icon: ShieldCheck },
      { href: "/terms", label: "Terms of Use", icon: Scale },
    ],
  },
  {
    title: "Source",
    links: [{ href: "https://github.com/jeromebadour/ai-summarizer", label: "Code on GitHub", icon: CodeXml, external: true }],
  },
];

/** The footer of the About, Privacy and Terms pages: where to go, and who made it. */
export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-panel/40">
      <div className="mx-auto grid max-w-[1120px] grid-cols-[1.4fr_repeat(3,1fr)] gap-10 px-8 py-10">
        <div>
          <div className="flex items-center gap-2.5">
            <BrandMark size={32} />
            <span className="text-[16px] font-semibold tracking-[-0.01em]">Distill</span>
          </div>
          <p className="mt-3 max-w-[260px] text-[13px] leading-relaxed text-muted">Summaries you can check: every point linked to its sentences, every number checked against your text.</p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-faint">{col.title}</h3>
            <ul className="mt-3 space-y-2">
              {col.links.map(({ href, label, icon: Icon, external }) => (
                <li key={href}>
                  {external ? (
                    <a href={href} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[13px] text-muted hover:text-text">
                      <Icon size={14} strokeWidth={2} className="text-brand-strong" />
                      {label}
                    </a>
                  ) : (
                    <Link href={href as never} className="flex items-center gap-2 text-[13px] text-muted hover:text-text">
                      <Icon size={14} strokeWidth={2} className="text-brand-strong" />
                      {label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-[1120px] items-center gap-4 px-8 py-4 font-mono text-[11.5px] text-muted">
          <span>© 2026 Jerome Badour. All rights reserved.</span>
          <span className="ml-auto">Built by Jerome Badour</span>
        </div>
      </div>
    </footer>
  );
}
