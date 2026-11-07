import { actingAs } from "@/lib/server/db";
import { currentUser } from "@/lib/server/session";

/**
 * "Export your data": the signed-in user's account and every summary (source, points, figures), as one JSON file.
 * Read as the user under row-level security, so it can only ever hold their own rows.
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return new Response("Sign in to export your data.", { status: 401 });

  const data = await actingAs(user.id, async (db) => {
    const account = (
      await db.query(
        "select name, username, email, role, avatar_colour, default_length, theme, motion, created_at from users",
      )
    ).rows[0];
    const summaries = (
      await db.query(
        `select id, title, source_text, sentences, points, figures, figure_status, length, model, input_tokens,
                output_tokens, cost_usd, seconds, words_in, words_out, created_at
         from summaries order by created_at desc, id desc`,
      )
    ).rows;
    return { account, summaries };
  });

  const body = JSON.stringify({ exportedAt: new Date().toISOString(), app: "Distill", ...data }, null, 2);
  const day = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="distill-${user.username}-${day}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
