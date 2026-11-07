import type { SummaryLength } from "@/lib/summary";

export type LibraryFilterParams = { q: string; lengths: SummaryLength[]; flagged: boolean };

/** Saved's URL for a filter and page: page 1 and empty filters are left out, so every view has one clean link. */
export function savedHref(filter: LibraryFilterParams, page = 1): string {
  const params = new URLSearchParams();
  if (filter.q) params.set("q", filter.q);
  if (filter.lengths.length > 0) params.set("length", filter.lengths.join(","));
  if (filter.flagged) params.set("flagged", "1");
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/saved?${query}` : "/saved";
}

export function isFiltered(filter: LibraryFilterParams): boolean {
  return filter.q !== "" || filter.lengths.length > 0 || filter.flagged;
}
