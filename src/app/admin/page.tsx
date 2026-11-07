import { Suspense } from "react";
import { AdminShell } from "@/components/AdminShell";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Rail } from "@/components/Rail";
import { requireStaff, toAccount } from "@/lib/server/account";
import { findAccount, staffAction } from "@/app/actions/admin";
import { liveSource } from "@/lib/server/admin-source";
import { pageSizeFor } from "@/lib/paging";
import { partsIn, viewerHeight, viewerZone } from "@/lib/server/zone";

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
  const user = await requireStaff();
  const zone = await viewerZone();
  const account = toAccount(user, zone);
  const now = partsIn(new Date(), zone);
  return (
    <AdminShell
      mode={{ kind: "live", account }}
      params={params}
      source={liveSource(user, zone, pageSizeFor("adminTable", await viewerHeight()))}
      rail={<Rail page="admin" account={account} />}
      clock={now.time}
      today={now.day}
      act={staffAction}
      find={findAccount}
    />
  );
}
