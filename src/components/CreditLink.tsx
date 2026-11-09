import { ArrowUpRight, UserRound } from "lucide-react";

/**
 * Jerome's site, opened on Distill's case study. `via=upwork` puts the site in its Upwork mode (no Message button, no
 * email, no Discord): Upwork's profile links to this app, and a page reached from the profile must not lead straight
 * to contact off Upwork. The README links the plain page instead.
 */
export const CREDIT_URL = "https://jeromebadour.com/work/distill?via=upwork";

/** "Built by Jerome Badour", one link for every place the app credits him. */
export function CreditLink({ className = "" }: { className?: string }) {
  return (
    <a href={CREDIT_URL} target="_blank" rel="noreferrer" className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap text-brand-strong hover:text-text ${className}`}>
      <UserRound size={14} strokeWidth={2} />
      Built by Jerome Badour
      <ArrowUpRight size={12} strokeWidth={2.1} className="opacity-70" />
    </a>
  );
}
