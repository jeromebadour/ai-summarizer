import { Suspense } from "react";
import { AdminShell } from "@/components/AdminShell";
import { LoadingScreen } from "@/components/LoadingScreen";
import { demoActivity, demoOverview, demoRoles, demoSpendByUser, demoUserDetail, demoUsers } from "@/lib/demo";

/**
 * The public admin demo. It reads only the invented data in `src/lib/demo.ts`: no database, no session, no Claude,
 * no limits. Writes are refused by `src/proxy.ts` before anything runs.
 */
export default function DemoAdminPage({ searchParams }: PageProps<"/demo/admin">) {
  return (
    <Suspense fallback={<LoadingScreen label="Loading the admin demo" />}>
      <DemoAdmin searchParams={searchParams} />
    </Suspense>
  );
}

async function DemoAdmin({ searchParams }: Pick<PageProps<"/demo/admin">, "searchParams">) {
  const params = await searchParams;
  return <AdminShell mode={{ kind: "demo" }} params={params} data={{ overview: demoOverview, users: demoUsers, userDetail: demoUserDetail, activity: demoActivity, spendByUser: demoSpendByUser, roles: demoRoles }} />;
}
