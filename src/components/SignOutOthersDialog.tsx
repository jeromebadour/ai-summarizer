import { LogOut, X } from "lucide-react";
import Link from "@/components/NavLink";
import { signOutOthers } from "@/app/actions/account";
import { Dialog, keepButton } from "@/components/Dialog";
import { PendingButton } from "@/components/PendingButton";

/** Security tab: signing out every other device asks first, naming how many it ends. */
export function SignOutOthersDialog({ others, closeHref }: { others: number; closeHref: string }) {
  return (
    <Dialog
      tone="clear"
      icon={LogOut}
      title={`Sign out ${others === 1 ? "the other device" : `${others} other devices`}?`}
      detail={`${others === 1 ? "It has" : "Each has"} to sign in again to use your account. This device stays signed in.`}
      formAction={signOutOthers}
      actions={
        <>
          <Link href={closeHref} className={keepButton}>
            <X size={17} strokeWidth={2} className="text-brand-strong" />
            Keep
          </Link>
          <PendingButton
            icon={<LogOut size={17} strokeWidth={2} />}
            label="Sign out others"
            pendingLabel="Signing out"
            className="flex items-center gap-2 rounded-xl bg-clear-strong px-4 py-2 text-[13.5px] font-semibold text-white hover:brightness-110"
          />
        </>
      }
    />
  );
}
