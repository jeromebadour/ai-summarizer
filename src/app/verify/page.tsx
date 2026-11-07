import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CheckInbox } from "@/components/AccountSteps";
import { AuthLayout } from "@/components/AuthLayout";
import { LoadingScreen } from "@/components/LoadingScreen";
import { actingAs } from "@/lib/server/db";
import { currentUser } from "@/lib/server/session";

/** Waiting for an email to be confirmed: after sign-up, a guest upgrade, or an email change in Profile. */
export default function VerifyPage() {
  return (
    <Suspense fallback={<LoadingScreen label="Loading" />}>
      <Verify />
    </Suspense>
  );
}

async function Verify() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const waiting = await actingAs(user.id, async (db) => (await db.query("select verify_waiting() as w", [])).rows[0].w);
  // Nothing to confirm (a guest, or already done, or confirmed in another tab: this page refreshes itself).
  if (!waiting?.needed) redirect("/");
  return (
    <AuthLayout>
      <CheckInbox email={waiting.email} live={waiting.live} change={user.emailVerified} />
    </AuthLayout>
  );
}
