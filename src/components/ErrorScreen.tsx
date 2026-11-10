import { ServerCrash, type GlyphIcon } from "@/components/glyphs";
import type { ReactNode } from "react";

/** Full-screen problem state, styled like the app, for errors and missing pages. */
export function ErrorScreen({ icon: Icon = ServerCrash, title, detail, code, actions }: { icon?: GlyphIcon; title: string; detail: string; code?: string; actions: ReactNode }) {
  return (
    <div role="alert" className="grid h-screen place-items-center px-6">
      <div className="w-[460px] overflow-hidden rounded-2xl border border-flag/35 bg-panel max-md:w-full">
        <div className="h-px bg-gradient-to-r from-transparent via-flag/70 to-transparent" aria-hidden />
        <div className="flex gap-4 p-6">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-flag/40 bg-flag-soft text-flag">
            <Icon size={21} strokeWidth={1.9} />
          </span>
          <div className="min-w-0">
            <h1 className="text-[17px] font-semibold">{title}</h1>
            <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{detail}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-border bg-panel-raised/40 px-6 py-4 max-md:flex-wrap">
          {actions}
          {code && <span className="ml-auto font-mono text-[11px] text-muted">{code}</span>}
        </div>
      </div>
    </div>
  );
}
