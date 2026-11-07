import "server-only";
import { whenLabel } from "@/lib/admin";
import { pageOf, pageSizes, type Page } from "@/lib/paging";
import type { FigureStatus, KeyFigure, SavedItem, SourceSentence, Summary, SummaryLength, SummaryPoint } from "@/lib/summary";
import { actingAs } from "./db";
import type { CurrentUser } from "./session";
import { partsIn, viewerZone } from "./zone";

/**
 * The user's own library, always read as the user under row-level security: a query can only ever see their rows,
 * and someone else's summary id simply isn't there (a 404, never "not yours").
 */

const lengths: SummaryLength[] = ["short", "medium", "bullets"];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type LibraryFilter = { q: string; lengths: SummaryLength[]; flagged: boolean };

/** Reads the filter from the URL; anything unknown is ignored. */
export function filterFrom(params: Record<string, string | string[] | undefined>): LibraryFilter {
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
  const q = one(params.q).trim().slice(0, 100);
  const picked = one(params.length).split(",").filter((l): l is SummaryLength => lengths.includes(l as SummaryLength));
  return { q, lengths: [...new Set(picked)], flagged: one(params.flagged) === "1" };
}

function label(at: Date, zone: string, now: Date): string {
  const p = partsIn(at, zone);
  return whenLabel(`${p.day}T${p.time}`, partsIn(now, zone).day);
}

/** One page of the library (7, newest first) and the total, filtered in the database. */
/** One page of the library; `size` is how many rows fit the viewer's window (pageSizeFor). */
export async function listLibrary(user: CurrentUser, filter: LibraryFilter, rawPage: string | string[] | undefined, size: number = pageSizes.saved): Promise<{ items: SavedItem[]; page: Page }> {
  const zone = await viewerZone();
  const now = new Date();
  return actingAs(user.id, async (db) => {
    const where: string[] = [];
    const args: unknown[] = [];
    if (filter.q) {
      // Literal search: % and _ typed by the user are searched for, not used as wildcards.
      args.push(`%${filter.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
      const n = args.length;
      where.push(`(title ilike $${n} or source_text ilike $${n} or points::text ilike $${n})`);
    }
    if (filter.lengths.length > 0) {
      args.push(filter.lengths);
      where.push(`length = any($${args.length}::summary_length[])`);
    }
    if (filter.flagged) where.push("figure_status = 'flagged'");
    const clause = where.length ? `where ${where.join(" and ")}` : "";

    const total = Number((await db.query(`select count(*) as n from summaries ${clause}`, args)).rows[0].n);
    const page = pageOf(rawPage, total, size);
    const rows = (
      await db.query(
        `select id, title, length, created_at, words_in, words_out, figure_status,
                points->0->>'text' as preview,
                coalesce((select jsonb_agg(f->>'value') from (select * from jsonb_array_elements(figures) limit 3) as x(f)), '[]') as key_figures
         from summaries ${clause}
         order by created_at desc, id desc
         limit ${page.size} offset ${page.offset}`,
        args,
      )
    ).rows;
    const items: SavedItem[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      length: r.length,
      createdAt: label(r.created_at, zone, now),
      date: partsIn(r.created_at, zone).day,
      wordsIn: r.words_in,
      wordsOut: r.words_out,
      figureStatus: r.figure_status as FigureStatus,
      preview: r.preview ?? "",
      keyFigures: r.key_figures as string[],
    }));
    return { items, page };
  });
}

export type SavedSummary = {
  id: string;
  summary: Summary;
  sentences: SourceSentence[];
  savedAt: string;
  /** 1-based place in the library, newest first, and the library's size. */
  position: number;
  total: number;
  newerId: string | null;
  olderId: string | null;
};

/** One saved summary with its place in the library, or null if it isn't this user's (or doesn't exist). */
export async function getSaved(user: CurrentUser, id: string): Promise<SavedSummary | null> {
  if (!uuid.test(id)) return null;
  const zone = await viewerZone();
  const now = new Date();
  return actingAs(user.id, async (db) => {
    const r = (await db.query("select * from summaries where id = $1", [id])).rows[0];
    if (!r) return null;
    // Neighbours in the same order as the list: newest first, ties broken by id. Compared inside the database by
    // id: a timestamp read into JavaScript loses its microseconds, and the summary would then look newer than itself.
    const nav = (
      await db.query(
        `with me as (select created_at, id from summaries where id = $1)
         select
           (select count(*) from summaries s, me where (s.created_at, s.id) > (me.created_at, me.id)) + 1 as position,
           (select count(*) from summaries) as total,
           (select s.id from summaries s, me where (s.created_at, s.id) > (me.created_at, me.id) order by s.created_at, s.id limit 1) as newer,
           (select s.id from summaries s, me where (s.created_at, s.id) < (me.created_at, me.id) order by s.created_at desc, s.id desc limit 1) as older`,
        [r.id],
      )
    ).rows[0];
    return {
      id: r.id,
      sentences: r.sentences as SourceSentence[],
      summary: {
        title: r.title,
        length: r.length,
        points: r.points as SummaryPoint[],
        figures: r.figures as KeyFigure[],
        model: r.model,
        seconds: Number(r.seconds),
        usage: { inputTokens: r.input_tokens, outputTokens: r.output_tokens, costUsd: Number(r.cost_usd) },
      },
      savedAt: label(r.created_at, zone, now),
      position: Number(nav.position),
      total: Number(nav.total),
      newerId: nav.newer,
      olderId: nav.older,
    };
  });
}
