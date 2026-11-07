import { Suspense } from "react";
import { LinkExpired, SetNewPassword } from "@/components/AccountSteps";
import { AuthLayout } from "@/components/AuthLayout";
import { LoadingScreen } from "@/components/LoadingScreen";
import { actingAs } from "@/lib/server/db";
import { hashToken } from "@/lib/server/session";

/** From the reset email's button, or from the code: shows whose password, without using the link up. */
export default function ResetPage({ searchParams }: PageProps<"/reset">) {
  return (
    <Suspense fallback={<LoadingScreen label="Loading" />}>
      <Reset searchParams={searchParams} />
    </Suspense>
  );
}

async function Reset({ searchParams }: Pick<PageProps<"/reset">, "searchParams">) {
  const { token } = await searchParams;
  const ok = typeof token === "string" && /^[A-Za-z0-9_-]{20,100}$/.test(token);
  const email = ok
    ? await actingAs(null, async (db) => (await db.query("select reset_link_email($1) as e", [hashToken(token)])).rows[0].e as string | null)
    : null;
  return <AuthLayout>{email && ok ? <SetNewPassword email={email} token={token} /> : <LinkExpired what="reset" />}</AuthLayout>;
}
