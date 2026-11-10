import { ChartColumn, KeyRound, SlidersHorizontal, UserRound } from "@/components/glyphs";
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
import { SignOutOthersDialog } from "@/components/SignOutOthersDialog";
import { QuotaRing } from "@/components/QuotaRing";
import { Rail } from "@/components/Rail";
import { LiveStatus } from "@/components/LiveStatus";
import { loadProfile, requireUser } from "@/lib/server/account";

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
  const user = await requireUser();
  const params = await searchParams;
  const { account, stats, devices, passwordChanged, quota } = await loadProfile(user);
  const guest = account.isGuest;
  // Guests have no password, devices list or account to delete: no Security tab.
  const shownTabs = guest ? tabs.filter((t) => t.key !== "security") : tabs;
  const tab = shownTabs.find((t) => t.key === params.tab)?.key ?? "overview";
  const tabHref = (key: string) => (key === "overview" ? "/profile" : `/profile?tab=${key}`);
  const dialog = params.dialog;

  return (
    <div className="flex h-screen max-md:h-auto max-md:min-h-dvh">
      <Rail page="profile" account={account} />
      <main className="flex min-w-0 flex-1 flex-col gap-4 p-5 max-md:gap-3 max-md:px-3 max-md:pb-24 max-md:pt-3">
        <div className="flex items-center gap-4 max-md:flex-wrap max-md:gap-x-3 max-md:gap-y-2">
          <UserRound size={22} strokeWidth={1.9} className="text-brand-strong" />
          <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Profile</h1>
          <PageTabs current={tab} tabs={shownTabs.map((t) => ({ ...t, href: tabHref(t.key) }))} />
          <LiveStatus initial={{ kind: "ready" }} />
          <div className="ml-auto max-md:hidden">
            <QuotaRing {...quota} />
          </div>
        </div>
        {tab === "overview" && <ProfileOverview account={account} stats={stats} />}
        {tab === "preferences" && <ProfilePreferences account={account} defaultLength={user.defaultLength} />}
        {tab === "security" && <ProfileSecurity devices={devices} passwordChanged={passwordChanged} canDelete={account.role !== "owner"} />}
      </main>
      {/* Dialogs live in the URL, so Back closes them and each has a link. Only the ones this user can use open. */}
      {guest && tab === "overview" && dialog === "keep" && <KeepSummariesDialog summaries={stats.summaries} closeHref="/profile" />}
      {!guest && tab === "overview" && dialog === "edit" && <EditProfileDialog account={account} closeHref="/profile" />}
      {!guest && tab === "security" && dialog === "delete" && account.role !== "owner" && (
        <DeleteAccountDialog account={account} summaries={stats.summaries} devices={devices.length} closeHref="/profile?tab=security" />
      )}
      {!guest && tab === "security" && dialog === "signout-others" && devices.some((d) => !d.current) && (
        <SignOutOthersDialog others={devices.filter((d) => !d.current).length} closeHref="/profile?tab=security" />
      )}
      {!guest && tab === "security" && dialog === "password" && (
        <ChangePasswordDialog email={account.email} otherDevices={devices.filter((d) => !d.current).length} closeHref="/profile?tab=security" />
      )}
    </div>
  );
}
