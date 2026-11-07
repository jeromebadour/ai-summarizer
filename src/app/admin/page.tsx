import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminShell } from "@/components/AdminShell";
import { LoadingScreen } from "@/components/LoadingScreen";
import { isStaff } from "@/lib/permissions";
import { sampleOwner } from "@/lib/sample";
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
  // Stands in for the signed-in account until auth is wired.
  const account = sampleOwner;
  // Non-staff never learn the console exists.
  if (!isStaff(account.role)) notFound();

  const overview = params.attention === "1" ? adminOverviewTrouble : adminOverview;
  return <AdminShell mode={{ kind: "live", account }} params={params} data={{ overview, users: adminUsers, userDetail: adminUserDetail, activity: adminActivity, spendByUser, roles: { holders: adminRoleHolders, changes: adminRoleChanges } }} />;
}
