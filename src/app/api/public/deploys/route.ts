import { connection } from "next/server";
import { publicDeploys } from "@/lib/server/deploys";

/**
 * GET /api/public/deploys: { live_since, deploys, commit } for jeromebadour.com's service board. Public and read-only:
 * no cookies are read or set, and it holds only the deploy days and the live commit.
 */
export async function GET() {
  // Read per request, never at build time (the build has no database); outside the try, so Next sees it.
  await connection();
  try {
    const body = JSON.stringify(await publicDeploys());
    return new Response(body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=300",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("public deploys:", error);
    return Response.json({ error: "deploys are not available right now" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
