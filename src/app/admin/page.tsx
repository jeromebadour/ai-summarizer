import { Suspense } from "react";
import { AdminShell } from "@/components/AdminShell";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Rail } from "@/components/Rail";
import { requireStaff, toAccount } from "@/lib/server/account";
import { viewerZone } from "@/lib/server/zone";
import { adminActivity, adminOverview, adminOverviewTrouble, adminRoleChanges, adminRoleHolders, adminUserDetail, adminUsers, spendByUser } from "@/lib/sample-admin";

export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <Suspense fallback={<LoadingScreen label="Loading the console" />}>
      <Admin searchParams={searchParams} />
    </Suspense>
  );
}

async function Admin({ searchParams }: Pick<PageProps<"/admin">, "searchParams">) {
  const params = await searchParams;
  // Non-staff (and signed-out visitors after /login) never learn the console exists: they get a 404.
  const account = toAccount(await requireStaff(), await viewerZone());

  const base = params.attention === "1" ? adminOverviewTrouble : adminOverview;
  // Sample states for the pictures, until the console reads the database: ?paused=guests or ?paused=all.
  const pause = { since: "2026-11-07T11:52", by: adminUsers.find((u) => u.person.role === "owner")!.person, reason: "Guest farming from one network" };
  const overview =
    params.paused === "guests"
      ? { ...base, pauses: { guests: pause, all: null } }
      : params.paused === "all"
        ? { ...base, pauses: { guests: null, all: { ...pause, reason: "Claude incident, waiting for it to settle" } } }
        : base;
  return <AdminShell mode={{ kind: "live", account }} params={params} data={{ overview, users: adminUsers, userDetail: adminUserDetail, activity: adminActivity, spendByUser, roles: { holders: adminRoleHolders, changes: adminRoleChanges } }} rail={<Rail page="admin" account={account} />} />;
}
