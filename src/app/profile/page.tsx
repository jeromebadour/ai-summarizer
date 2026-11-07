import { ChartColumn, KeyRound, SlidersHorizontal, UserRound } from "lucide-react";
import { Suspense } from "react";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { DeleteAccountDialog } from "@/components/DeleteAccountDialog";
import { EditProfileDialog } from "@/components/EditProfileDialog";
import { KeepSummariesDialog } from "@/components/KeepSummariesDialog";
import { LoadingScreen } from "@/components/LoadingScreen";
import { PageTabs } from "@/components/PageTabs";
import { ProfileOverview } from "@/components/ProfileOverview";
import { ProfilePreferences } from "@/components/ProfilePreferences";
import { ProfileSecurity } from "@/components/ProfileSecurity";
import { QuotaRing } from "@/components/QuotaRing";
import { Rail } from "@/components/Rail";
import { StatusPill } from "@/components/StatusPill";
import { sampleAccount, sampleDevices, sampleGuest, sampleGuestStats, samplePasswordChanged, sampleStats } from "@/lib/sample";

const tabs = [
  { key: "overview", label: "Overview", icon: ChartColumn },
  { key: "preferences", label: "Preferences", icon: SlidersHorizontal },
  { key: "security", label: "Security", icon: KeyRound },
] as const;

export default function ProfilePage({ searchParams }: PageProps<"/profile">) {
  return (
    <Suspense fallback={<LoadingScreen label="Loading your profile" />}>
      <Profile searchParams={searchParams} />
    </Suspense>
  );
}

async function Profile({ searchParams }: Pick<PageProps<"/profile">, "searchParams">) {
  const params = await searchParams;
  const guest = params.as === "guest";
  const account = guest ? sampleGuest : sampleAccount;
  const stats = guest ? sampleGuestStats : sampleStats;
  const shownTabs = guest ? tabs.filter((t) => t.key !== "security") : tabs;
  const requested = params.tab;
  const tab = shownTabs.find((t) => t.key === requested)?.key ?? "overview";

  return (
    <div className="flex h-screen">
      <Rail page="profile" account={account} />
      <main className="flex min-w-0 flex-1 flex-col gap-5 p-6">
        <div className="flex items-center gap-4">
          <UserRound size={22} strokeWidth={1.9} className="text-brand-strong" />
          <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Profile</h1>
          <PageTabs
            current={tab}
            tabs={shownTabs.map((t) => ({ ...t, href: t.key === "overview" ? `/profile${guest ? "?as=guest" : ""}` : `/profile?tab=${t.key}${guest ? "&as=guest" : ""}` }))}
          />
          <StatusPill status={tab === "preferences" ? { kind: "saved", label: "Preference saved", at: "11:53" } : { kind: "ready" }} />
          <div className="ml-auto">
            {guest ? <QuotaRing used={3} limit={5} resetsAt="14:42" /> : <QuotaRing used={1} limit={10} resetsAt="12:52" dayUsed={2} dayLimit={30} />}
          </div>
        </div>
        {tab === "overview" && <ProfileOverview account={account} stats={stats} />}
        {tab === "preferences" && <ProfilePreferences account={account} defaultLength="medium" />}
        {tab === "security" && <ProfileSecurity devices={sampleDevices} passwordChanged={samplePasswordChanged} />}
      </main>
      {guest && params.dialog === "keep" && (
        <KeepSummariesDialog
          summaries={stats.summaries}
          initial={{ name: "Oliver Hart", username: "oliver_h", usernameStatus: { status: "available" }, email: "oliver@example.com", password: "lantern42" }}
        />
      )}
      {tab === "overview" && params.dialog === "edit" && (
        <EditProfileDialog account={sampleAccount} initialName="Maya Klein" initialEmail="maya@kleinstudio.com" />
      )}
      {tab === "security" && params.dialog === "delete" && (
        <DeleteAccountDialog account={sampleAccount} summaries={sampleStats.summaries} devices={sampleDevices.length} initialConfirm="maya_k" />
      )}
      {tab === "security" && params.dialog === "password" && (
        <ChangePasswordDialog
          email={sampleAccount.email}
          otherDevices={sampleDevices.filter((d) => !d.current).length}
          initialCurrent="harbor2026"
          initialNext="riverdesk7"
        />
      )}
    </div>
  );
}
