import { Suspense } from "react";
import { AdminShell } from "@/components/AdminShell";
import { DemoRail } from "@/components/DemoRail";
import { LoadingScreen } from "@/components/LoadingScreen";
import { demoSource } from "@/lib/demo";

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
  // The demo's clock is frozen with its data: Saturday 7 November 2026, 12:31.
  return <AdminShell mode={{ kind: "demo" }} params={params} source={demoSource} rail={<DemoRail />} clock="12:31" today="2026-11-07" />;
}
