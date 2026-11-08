import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "@/components/NavLink";
import { pageWindow, type Page } from "@/lib/paging";

/**
 * The one pager for every list and table. Hidden when everything fits on one page.
 * `href` builds the link for a page number, keeping the list's search and filters.
 */
export function Pager({ page, noun, href }: { page: Page; noun: string; href: (page: number) => string }) {
  if (page.pages <= 1) return null;
  const step = "flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12.5px] font-semibold text-text hover:border-brand-line hover:bg-brand-soft";
  return (
    <nav aria-label={`${noun} pages`} className="flex items-center gap-3 border-t border-border pt-4 max-md:flex-wrap max-md:justify-center max-md:gap-2 max-md:pt-3">
      <span className="font-mono text-[11.5px] text-muted">
        Showing <span className="text-text">{page.from}–{page.to}</span> of <span className="text-text">{page.total.toLocaleString("en-US")}</span> {noun}
      </span>
      <div className="ml-auto flex items-center gap-1.5 max-md:ml-0">
        {page.page > 1 && (
          <Link href={href(page.page - 1) as never} className={step}>
            <ChevronLeft size={15} strokeWidth={2.2} className="text-brand-strong" />
            Previous
          </Link>
        )}
        {pageWindow(page.page, page.pages).map((n, i) =>
          n === "gap" ? (
            <span key={`gap-${i}`} className="w-6 text-center font-mono text-[12px] text-faint">
              …
            </span>
          ) : (
            <Link
              key={n}
              href={href(n) as never}
              aria-current={n === page.page ? "page" : undefined}
              className={`grid h-8 min-w-8 place-items-center rounded-lg px-2 font-mono text-[12.5px] font-semibold ${
                n === page.page ? "bg-brand text-on-brand" : "text-muted hover:bg-panel-raised hover:text-text"
              }`}
            >
              {n}
            </Link>
          ),
        )}
        {page.page < page.pages && (
          <Link href={href(page.page + 1) as never} className={step}>
            Next
            <ChevronRight size={15} strokeWidth={2.2} className="text-brand-strong" />
          </Link>
        )}
      </div>
    </nav>
  );
}
