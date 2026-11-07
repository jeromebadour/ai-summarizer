import { NextResponse, type NextRequest } from "next/server";

/**
 * The admin demo is read-only on the server, not just in the browser: anything under /demo that isn't a plain read
 * (a form post, a server action, any write) is refused before a page or action runs.
 */
export function proxy(request: NextRequest) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new NextResponse("The admin demo is read-only.", { status: 405, headers: { Allow: "GET, HEAD" } });
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/demo/:path*",
};
