import Link from "@/components/NavLink";
import { BrandMark } from "@/components/BrandMark";
import { CodeXml, Library, Link2, ShieldCheck } from "lucide-react";
import { AuthShowcase } from "@/components/AuthShowcase";

/** The sign-in screens' frame: Distill's story on the left, the step on the right (sign in, verify, reset). */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-screen grid-cols-[1.15fr_1fr] max-md:h-auto max-md:min-h-dvh max-md:grid-cols-1">
      <section className="flex flex-col justify-between border-r border-border bg-[radial-gradient(900px_500px_at_20%_10%,var(--glow),transparent_70%)] px-16 py-9 max-md:order-2 max-md:gap-6 max-md:border-r-0 max-md:border-t max-md:px-5 max-md:py-8">
        <div className="flex items-center gap-3 max-md:hidden">
          <BrandMark size={40} />
          <span className="text-[19px] font-semibold tracking-[-0.01em]">Distill</span>
        </div>

        <div>
          <h1 className="max-w-[640px] text-[44px] font-semibold leading-[1.1] tracking-[-0.025em] max-md:text-[26px]">Summaries you can check.</h1>
          <p className="mt-4 max-w-[480px] text-[16px] leading-relaxed text-muted max-md:mt-2 max-md:text-[14px]">
            Every point links to the sentences it came from, and every number is checked against your text.
          </p>
          <ul className="mt-6 flex gap-2 max-md:mt-4 max-md:flex-wrap">
            <li className="flex items-center gap-2 rounded-lg border border-brand-line bg-brand-soft px-3 py-1.5 text-[12.5px] font-semibold text-brand-strong">
              <Link2 size={15} strokeWidth={2.1} />
              Linked to the source
            </li>
            <li className="flex items-center gap-2 rounded-lg border border-verify/30 bg-verify-soft px-3 py-1.5 text-[12.5px] font-semibold text-verify">
              <ShieldCheck size={15} strokeWidth={2.1} />
              Figures checked
            </li>
            <li className="flex items-center gap-2 rounded-lg border border-input/30 bg-input-soft px-3 py-1.5 text-[12.5px] font-semibold text-input">
              <Library size={15} strokeWidth={2.1} />
              Saved for later
            </li>
          </ul>
          <div className="max-md:hidden">
            <AuthShowcase />
          </div>
        </div>

        <div className="flex items-center gap-4 font-mono text-[11.5px] text-muted max-md:flex-wrap max-md:gap-x-4 max-md:gap-y-2">
          <span>Built by Jerome Badour</span>
          <span>© 2026 Jerome Badour</span>
          <Link href="/about" className="text-brand-strong hover:text-text">About</Link>
          <Link href="/privacy" className="text-brand-strong hover:text-text">Privacy</Link>
          <Link href="/terms" className="text-brand-strong hover:text-text">Terms</Link>
          <a href="https://github.com/jeromebadour/ai-summarizer" className="flex items-center gap-1.5 text-brand-strong hover:text-text">
            <CodeXml size={14} strokeWidth={2} />
            Source on GitHub
          </a>
        </div>
      </section>

      <section className="grid place-items-center px-12 max-md:order-1 max-md:place-items-stretch max-md:content-start max-md:gap-6 max-md:px-4 max-md:pb-8 max-md:pt-6">
        {/* Phone: the mark and name sit above the step (the story column moves below it). */}
        <div className="hidden items-center gap-2.5 md:hidden max-md:flex">
          <BrandMark size={34} />
          <span className="text-[17px] font-semibold tracking-[-0.01em]">Distill</span>
        </div>
        {children}
      </section>
    </div>
  );
}
