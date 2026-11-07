import "server-only";
import { hash, verify } from "@node-rs/argon2";

// Argon2id with OWASP's recommended minimum (19 MiB, 2 passes, 1 lane).
// (2 is Argon2id in the library's const enum, which can't be imported under isolatedModules.)
const options = { algorithm: 2, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, options);
}

let dummy: Promise<string> | undefined;

/**
 * Checks a password against a stored hash. With no hash (unknown account) it still runs one full check against a
 * throwaway hash, so "no such account" and "wrong password" take the same time and can't be told apart.
 */
export async function checkPassword(storedHash: string | null, password: string): Promise<boolean> {
  if (!storedHash) {
    dummy ??= hashPassword("distill-no-such-account");
    await verify(await dummy, password).catch(() => false);
    return false;
  }
  return verify(storedHash, password).catch(() => false);
}
