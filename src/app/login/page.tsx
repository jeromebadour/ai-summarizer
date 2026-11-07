import { CodeXml, Library, Link2, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthCard } from "@/components/AuthCard";
import { AuthShowcase } from "@/components/AuthShowcase";
import { LoadingScreen } from "@/components/LoadingScreen";
import { currentUser } from "@/lib/server/session";
import { guestsOpen } from "@/lib/server/settings";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <Suspense fallback={<LoadingScreen label="Loading" />}>
      <Login searchParams={searchParams} />
    </Suspense>
  );
}

async function Login({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  // Already signed in (or a guest): nothing to do here.
  if (await currentUser()) redirect("/");
  const mode = (await searchParams).mode === "signup" ? "signup" : "signin";

  return (
    <div className="grid h-screen grid-cols-[1.15fr_1fr]">
      <section className="flex flex-col justify-between border-r border-border bg-[radial-gradient(900px_500px_at_20%_10%,var(--glow),transparent_70%)] px-16 py-12">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-brand">
            <svg width="20" height="20" viewBox="0 0 22 22" aria-hidden>
              <rect x="2" y="3" width="18" height="3.2" rx="1.6" fill="var(--on-brand)" />
              <rect x="5" y="9.4" width="12" height="3.2" rx="1.6" fill="var(--on-brand)" />
              <rect x="8" y="15.8" width="6" height="3.2" rx="1.6" fill="var(--on-brand)" />
            </svg>
          </span>
          <span className="text-[19px] font-semibold tracking-[-0.01em]">Distill</span>
        </div>

        <div>
          <h1 className="max-w-[640px] text-[44px] font-semibold leading-[1.1] tracking-[-0.025em]">Summaries you can check.</h1>
          <p className="mt-4 max-w-[480px] text-[16px] leading-relaxed text-muted">
            Every point links to the sentences it came from, and every number is checked against your text.
          </p>
          <ul className="mt-6 flex gap-2">
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
          <AuthShowcase />
        </div>

        <div className="flex items-center gap-4 font-mono text-[11.5px] text-muted">
          <span>Built by Jerome Badour</span>
          <span>© 2026 Jerome Badour</span>
          <a href="https://github.com/jeromebadour/ai-summarizer" className="flex items-center gap-1.5 text-brand-strong hover:text-text">
            <CodeXml size={14} strokeWidth={2} />
            Source on GitHub
          </a>
        </div>
      </section>

      <section className="grid place-items-center px-12">
        <AuthCard initialMode={mode} guestsOpen={await guestsOpen()} />
      </section>
    </div>
  );
}
