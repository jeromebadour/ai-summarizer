import { LoaderCircle } from "@/components/glyphs";

export function LoadingScreen({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" className="grid h-screen place-items-center">
      <div className="flex items-center gap-3 rounded-full border border-brand-line bg-brand-soft px-5 py-2.5 text-[13px] font-semibold text-brand-strong">
        <LoaderCircle size={16} strokeWidth={2.2} className="animate-spin" />
        {label}
      </div>
    </div>
  );
}
