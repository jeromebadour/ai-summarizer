import { Suspense } from "react";
import { DistillWorkspace } from "@/components/DistillWorkspace";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Rail } from "@/components/Rail";
import { sampleSentences } from "@/lib/sample";
import { requireAccount } from "@/lib/server/account";
import { viewerOnPhone } from "@/lib/server/zone";
import { loadWorkspace } from "@/lib/server/workspace";

/** The invented sample source, as paragraphs, for the Sample button (never anyone's real text). */
const sampleText = Array.from(new Set(sampleSentences.map((s) => s.paragraph)))
  .map((p) =>
    sampleSentences
      .filter((s) => s.paragraph === p)
      .map((s) => s.text)
      .join(" "),
  )
  .join("\n\n");

export default function Home() {
  return (
    <Suspense fallback={<LoadingScreen label="Loading your workspace" />}>
      <Workspace />
    </Suspense>
  );
}

async function Workspace() {
  const { user, account } = await requireAccount();
  const initial = await loadWorkspace(user);
  return (
    <div className="flex h-screen max-md:h-auto max-md:min-h-dvh">
      <Rail page="distill" account={account} />
      <main className="flex min-w-0 flex-1 flex-col gap-4 p-5 max-md:gap-3 max-md:px-3 max-md:pb-24 max-md:pt-3">
        <DistillWorkspace initial={initial} defaultLength={user.defaultLength} guest={user.isGuest} sampleText={sampleText} links={user.links} view={user.resultView} phone={await viewerOnPhone()} />
      </main>
    </div>
  );
}
