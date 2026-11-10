"use client";

import { LoaderCircle, Search, X } from "@/components/glyphs";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

/**
 * A console search box. The query lives in the URL as `name` (so it has a link and Back works) and a new search goes
 * back to page 1. `hrefBase` is the tab's URL with its other filters and no page, built on the server.
 */
export function AdminSearch({ name, value: initial, hrefBase, placeholder, width }: { name: string; value: string; hrefBase: string; placeholder: string; width: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [pending, start] = useTransition();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const q = value.trim();
    const timer = setTimeout(() => start(() => router.replace(q ? `${hrefBase}&${name}=${encodeURIComponent(q)}` : hrefBase)), 300);
    return () => clearTimeout(timer);
    // Only typing starts a search; the base it builds on comes from the server with the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <label className={`flex ${width} items-center gap-2.5 rounded-xl border border-border-strong bg-paper px-3.5 py-2 focus-within:border-brand-line max-md:w-full`}>
      {pending ? <LoaderCircle size={16} strokeWidth={2} className="animate-spin text-brand-strong" /> : <Search size={16} strokeWidth={2} className="text-brand-strong" />}
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[13px] text-text outline-none placeholder:text-faint"
      />
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => setValue("")} className="text-muted hover:text-text">
          <X size={15} strokeWidth={2} />
        </button>
      )}
    </label>
  );
}
