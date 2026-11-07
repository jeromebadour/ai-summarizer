"use client";

import { LoaderCircle, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { bare, typingIn } from "@/lib/keys";
import { savedHref, type LibraryFilterParams } from "@/lib/library-url";

/**
 * Saved's search box: the database searches titles, summaries and sources; the query lives in the URL (so it has a
 * link and Back works) and a new search goes back to page 1. It waits for typing to pause before asking.
 */
export function SavedSearch({ filter }: { filter: LibraryFilterParams }) {
  const router = useRouter();
  const [value, setValue] = useState(filter.q);
  const [pending, start] = useTransition();
  const first = useRef(true);
  const input = useRef<HTMLInputElement>(null);

  // "/" jumps to the search box (listed on Preferences), unless you're already typing somewhere.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "/" && bare(event) && !typingIn(event)) {
        event.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const timer = setTimeout(() => start(() => router.replace(savedHref({ ...filter, q: value.trim() }))), 300);
    return () => clearTimeout(timer);
    // Only the typed value starts a search; the filter it builds on comes from the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <label className="flex w-[420px] items-center gap-2.5 rounded-xl border border-border-strong bg-paper px-3.5 py-2.5 focus-within:border-brand-line">
      {pending ? <LoaderCircle size={17} strokeWidth={2} className="animate-spin text-brand-strong" /> : <Search size={17} strokeWidth={2} className="text-brand-strong" />}
      <input
        ref={input}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search titles, summaries and sources"
        aria-label="Search saved summaries"
        className="min-w-0 flex-1 bg-transparent text-[13.5px] text-text outline-none placeholder:text-faint"
      />
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => setValue("")} className="text-muted hover:text-text">
          <X size={16} strokeWidth={2} />
        </button>
      )}
    </label>
  );
}
