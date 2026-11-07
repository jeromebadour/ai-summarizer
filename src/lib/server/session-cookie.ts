/**
 * The session cookie's name, on its own so pages that must stay free of database code (the admin demo) can tell
 * whether someone has a session without loading `session.ts`.
 * `__Host-` makes the browser refuse the cookie unless it is Secure, path=/ and set by this exact host.
 */
export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-distill_session" : "distill_session";
