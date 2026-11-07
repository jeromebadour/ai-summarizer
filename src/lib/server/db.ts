import "server-only";
import { Pool, type PoolClient } from "pg";

/**
 * The only way the app talks to Postgres. It connects as `distill_app`, which can't bypass row-level security, and
 * every query runs inside a transaction that first says who it is acting for. A query that forgets a WHERE still
 * sees only that person's rows.
 */
const globalForPool = globalThis as unknown as { distillPool?: Pool };

function makePool() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  return new Pool({ connectionString: process.env.DATABASE_URL, max: 10, idleTimeoutMillis: 30_000 });
}

function pool(): Pool {
  globalForPool.distillPool ??= makePool();
  return globalForPool.distillPool;
}

export type Db = PoolClient;

/** Runs `work` in one transaction acting for `userId` (null: nobody yet, e.g. before sign-in). */
export async function actingAs<T>(userId: string | null, work: (db: Db) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("begin");
    await client.query("select set_config('app.user_id', $1, true)", [userId ?? ""]);
    const result = await work(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/** Switches the acting user inside an open transaction (e.g. right after a session lookup or a sign-up insert). */
export async function actAs(db: Db, userId: string): Promise<void> {
  await db.query("select set_config('app.user_id', $1, true)", [userId]);
}

/** Postgres' unique-violation code, with the constraint that fired. */
export function uniqueViolation(error: unknown): string | null {
  const e = error as { code?: string; constraint?: string };
  return e?.code === "23505" ? (e.constraint ?? "") : null;
}
