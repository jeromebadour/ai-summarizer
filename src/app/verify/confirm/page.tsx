import { Suspense } from "react";
import { ConfirmLink, LinkExpired } from "@/components/AccountSteps";
import { AuthLayout } from "@/components/AuthLayout";
import { LoadingScreen } from "@/components/LoadingScreen";
import { currentUser } from "@/lib/server/session";

/** The email's "Confirm my email" button. Opening it changes nothing; the page posts the token itself. */
export default function ConfirmPage({ searchParams }: PageProps<"/verify/confirm">) {
  return (
    <Suspense fallback={<LoadingScreen label="Loading" />}>
      <Confirm searchParams={searchParams} />
    </Suspense>
  );
}

async function Confirm({ searchParams }: Pick<PageProps<"/verify/confirm">, "searchParams">) {
  const { token, state } = await searchParams;
  const ok = typeof token === "string" && /^[A-Za-z0-9_-]{20,100}$/.test(token);
  return (
    <AuthLayout>
      {ok && state !== "expired" ? <ConfirmLink token={token} /> : <LinkExpired what="verify" signedIn={Boolean(await currentUser())} />}
    </AuthLayout>
  );
}
