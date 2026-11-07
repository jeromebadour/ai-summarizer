import { randomBytes } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { claudeModel, costOf } from "@/lib/admin";
import { checkSummary, LineReader, MAX_OUTPUT_TOKENS, MAX_SOURCE_CHARS, readLine, systemPrompt, userMessage, type DistillLine } from "@/lib/distill";
import { splitSentences } from "@/lib/sentences";
import { countWords, type DistillFailure, type DistillStep, type SummaryLength, type SummaryPoint } from "@/lib/summary";
import { actingAs } from "@/lib/server/db";
import { currentUser } from "@/lib/server/session";

/**
 * The only place the app calls Claude. One POST runs one summary and answers with a stream of JSON lines, so the
 * screen can show each real stage as it happens:
 *   {"type":"step","step":"checking"|"sending"|"writing"|"linking"|"saving"}
 *   {"type":"quota","used":3,"limit":10,"nextFreeAt":"..."}          after the limit check
 *   {"type":"refused","reason":"hour"|"day"|"guests_day"|"cap"|"suspended","nextFreeAt":...}  a calm stop
 *   {"type":"partial","text":"..."}                                  the point being written
 *   {"type":"point","point":{...}}                                   a finished point
 *   {"type":"done","id":"...","summary":{...}}                       checked and saved
 *   {"type":"failed","failure":{title,detail,code,limitRefunded}}   anything that went wrong (use given back)
 */

const lengths: SummaryLength[] = ["short", "medium", "bullets"];

function requestId(): string {
  return `req_${randomBytes(3).toString("hex")}`;
}

/** What went wrong, in words a person can act on. The code is what they can quote. */
function describe(error: unknown, id: string): { failure: Omit<DistillFailure, "limitRefunded">; code: string } {
  if (error instanceof Anthropic.APIError) {
    const status = error.status ?? 0;
    const code = `HTTP ${status || "error"} · ${id}`;
    if (status === 529 || status === 503) {
      return { code: `claude_${status}`, failure: { title: "Claude is overloaded right now", detail: "The request reached Claude but it could not take it. Your text is still here; try again in a moment.", code } };
    }
    if (status === 429) {
      return { code: "claude_429", failure: { title: "Claude is busy right now", detail: "Too many requests reached Claude at once. Your text is still here; try again in a minute.", code } };
    }
    if (status === 401 || status === 403) {
      return { code: `claude_${status}`, failure: { title: "Summaries are paused", detail: "The app's connection to Claude needs attention. Your text is still here; the app's owner needs to fix this.", code } };
    }
    if (error instanceof Anthropic.APIConnectionTimeoutError || error instanceof Anthropic.APIConnectionError) {
      return { code: "claude_timeout", failure: { title: "Claude didn't answer in time", detail: "The connection to Claude dropped. Your text is still here; try again.", code: `timeout · ${id}` } };
    }
    return { code: `claude_${status}`, failure: { title: "Claude couldn't take this request", detail: "Something on Claude's side refused it. Your text is still here; try again.", code } };
  }
  return { code: "app_error", failure: { title: "Something went wrong in Distill", detail: "The summary wasn't made. Your text is still here; try again.", code: id } };
}

export async function POST(request: Request) {
  // JSON only: a plain cross-site form can't send this, and the session cookie is SameSite=Lax.
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return Response.json({ error: "Send JSON" }, { status: 415 });
  }
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in to summarize" }, { status: 401 });

  const raw = await request.text();
  if (raw.length > MAX_SOURCE_CHARS * 6 + 200) return Response.json({ error: "Too long" }, { status: 413 });
  let body: { text?: unknown; length?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Send JSON" }, { status: 400 });
  }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const length = lengths.includes(body.length as SummaryLength) ? (body.length as SummaryLength) : user.defaultLength;
  if (!text) return Response.json({ error: "Paste some text first" }, { status: 400 });
  if (text.length > MAX_SOURCE_CHARS) {
    return Response.json({ error: `Up to ${MAX_SOURCE_CHARS.toLocaleString("en-US")} characters` }, { status: 413 });
  }
  const sentences = splitSentences(text);

  const id = requestId();
  const started = Date.now();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const send = (event: object) => {
        if (open) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      const step = (s: DistillStep) => send({ type: "step", step: s });
      let useId: number | null = null;
      let priced = false;

      try {
        // 1. The limits, in one locked step in the database.
        step("checking");
        const claim = await actingAs(user.id, async (db) => (await db.query("select * from claim_use($1)", [user.id])).rows[0]);
        if (!claim.ok) {
          send({ type: "refused", reason: claim.reason, nextFreeAt: claim.next_free_at });
          return;
        }
        useId = Number(claim.use_id);
        send({ type: "quota", used: claim.used_hour, limit: claim.limit_hour, nextFreeAt: claim.next_free_at });

        // 2. Claude, streamed. The key lives only in the server's environment.
        if (!process.env.ANTHROPIC_API_KEY) throw Object.assign(new Error("ANTHROPIC_API_KEY is not set"), { distill: "no_key" });
        step("sending");
        const client = new Anthropic({ maxRetries: 1, timeout: 60_000 });
        const reply = client.messages.stream(
          {
            model: claudeModel,
            max_tokens: MAX_OUTPUT_TOKENS,
            system: systemPrompt(length),
            messages: [{ role: "user", content: userMessage(sentences) }],
          },
          { signal: request.signal },
        );

        const reader = new LineReader();
        const lines: DistillLine[] = [];
        let writing = false;
        let shownPoints = 0;
        const take = (line: string) => {
          const parsed = readLine(line);
          if (!parsed) return;
          lines.push(parsed);
          if (parsed.kind === "point") {
            shownPoints += 1;
            const point: SummaryPoint = { id: shownPoints, text: parsed.text, sourceIds: parsed.sources };
            send({ type: "point", point });
          }
        };
        reply.on("text", (delta) => {
          if (!writing) {
            writing = true;
            step("writing");
          }
          for (const line of reader.push(delta)) take(line);
          const partial = reader.partialPoint();
          if (partial) send({ type: "partial", text: partial });
        });
        const message = await reply.finalMessage();
        for (const line of reader.end()) take(line);

        // 3. Price the use now: Claude was paid whatever happens next.
        const inputTokens = message.usage.input_tokens;
        const outputTokens = message.usage.output_tokens;
        const cost = costOf(inputTokens, outputTokens);
        await actingAs(user.id, (db) => db.query("select record_cost($1, $2, $3, $4)", [useId, inputTokens, outputTokens, cost]));
        priced = true;

        // 4. Links and figures checked against the source.
        step("linking");
        const checked = checkSummary(lines, sentences);
        if (typeof checked === "string") {
          throw Object.assign(new Error(`unusable answer: ${checked}`), { distill: "unusable" });
        }

        // 5. Saved as the user, under row-level security.
        step("saving");
        const seconds = Math.round((Date.now() - started) / 10) / 100;
        const wordsOut = countWords(checked.points.map((p) => p.text).join(" "));
        const summaryId = await actingAs(user.id, async (db) => {
          const row = await db.query(
            `insert into summaries (user_id, title, source_text, sentences, points, figures, figure_status, length, model,
               input_tokens, output_tokens, cost_usd, seconds, words_in, words_out)
             values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) returning id`,
            [user.id, checked.title, text, JSON.stringify(sentences), JSON.stringify(checked.points), JSON.stringify(checked.figures),
              checked.figureStatus, length, claudeModel, inputTokens, outputTokens, cost, seconds, countWords(text), wordsOut],
          );
          return row.rows[0].id as string;
        });
        send({
          type: "done",
          id: summaryId,
          summary: {
            title: checked.title,
            length,
            points: checked.points,
            figures: checked.figures,
            figureStatus: checked.figureStatus,
            model: claudeModel,
            seconds,
            usage: { inputTokens, outputTokens, costUsd: cost },
          },
        });
      } catch (error) {
        const aborted = request.signal.aborted;
        const tag = (error as { distill?: string }).distill;
        const described =
          tag === "no_key"
            ? { code: "no_key", failure: { title: "Summaries are paused", detail: "The app's connection to Claude isn't set up yet. Your text is still here.", code: id } }
            : tag === "unusable"
              ? { code: "unusable", failure: { title: "Claude's answer couldn't be checked", detail: "It didn't link its points to your text, so it wasn't saved. Your text is still here; try again.", code: id } }
              : describe(error, id);
        // Failures never cost the user: the use comes back (its cost, if Claude was paid, stays in the spend).
        let refunded = false;
        if (useId !== null) {
          refunded = await actingAs(user.id, async (db) => (await db.query("select give_back($1) as ok", [useId])).rows[0].ok as boolean).catch(() => false);
        }
        await actingAs(user.id, (db) =>
          db.query("insert into request_errors (request_id, user_id, code, detail) values ($1, $2, $3, $4)", [
            id,
            user.id,
            aborted ? "cancelled" : described.code,
            `${priced ? "priced" : "unpriced"}: ${error instanceof Error ? error.message.slice(0, 300) : "unknown"}`,
          ]),
        ).catch(() => {});
        if (!aborted) send({ type: "failed", failure: { ...described.failure, limitRefunded: refunded } });
      } finally {
        open = false;
        try {
          controller.close();
        } catch {}
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Request-Id": id },
  });
}
