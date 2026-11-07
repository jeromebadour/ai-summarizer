/**
 * Every list and table in the app is paged on the server: only one page is ever read from the database
 * (ORDER BY newest first, LIMIT size OFFSET (page - 1) * size, plus one count), so a list stays fast at any size.
 * The page lives in the URL (?page=3), so every page has its own link and Back works.
 */
export const pageSizes = {
  saved: 7,
  adminTable: 15,
} as const;

/**
 * A page always fits the window without scrolling (BUILD-RULES 3.2), so the page size follows the window's height:
 * what is left after the screen's fixed parts (header, search, column heads, pager), divided by one row's height,
 * between a floor and the size above. `height` comes from the `vh` cookie; without it, the full size.
 */
const fit: Record<keyof typeof pageSizes, { chrome: number; row: number; min: number }> = {
  saved: { chrome: 300, row: 80, min: 4 },
  adminTable: { chrome: 270, row: 37, min: 8 },
};

export function pageSizeFor(list: keyof typeof pageSizes, height: number | null): number {
  const max = pageSizes[list];
  if (!height) return max;
  const { chrome, row, min } = fit[list];
  return Math.min(max, Math.max(min, Math.floor((height - chrome) / row)));
}

export type Page = {
  page: number;
  pages: number;
  size: number;
  total: number;
  /** 1-based, for "Showing 11–20 of 47". 0 when the list is empty. */
  from: number;
  to: number;
  offset: number;
};

/** Reads ?page safely: anything missing, broken or out of range lands on a real page. */
export function pageOf(raw: string | string[] | undefined, total: number, size: number): Page {
  const pages = Math.max(1, Math.ceil(total / size));
  const asked = Number.parseInt(Array.isArray(raw) ? raw[0] : (raw ?? "1"), 10);
  const page = Number.isFinite(asked) ? Math.min(Math.max(asked, 1), pages) : 1;
  const offset = (page - 1) * size;
  return { page, pages, size, total, offset, from: total === 0 ? 0 : offset + 1, to: Math.min(offset + size, total) };
}

/** The page numbers to show: always the first and last, the current one with its neighbours, gaps as "gap". */
export function pageWindow(page: number, pages: number): (number | "gap")[] {
  const keep = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  // Never hide a single page behind a gap: 1 … 3 becomes 1 2 3.
  if (keep.has(3) && !keep.has(2)) keep.add(2);
  if (keep.has(pages - 2) && !keep.has(pages - 1)) keep.add(pages - 1);
  const sorted = [...keep].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push("gap");
    out.push(n);
  });
  return out;
}
