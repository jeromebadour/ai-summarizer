"use client";

import { LogOut, UserRoundPlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "@/components/NavLink";
import { signOut } from "@/app/actions/auth";
import { Dialog, keepButton } from "@/components/Dialog";
import { PendingButton } from "@/components/PendingButton";

const signOutButton =
  "flex items-center gap-2 rounded-xl bg-clear-strong px-4 py-2 text-[13.5px] font-semibold text-white hover:brightness-110";

/**
 * The rail's Sign out asks first. A guest is told plainly what signing out costs: a guest account has no password,
 * so its summaries can't be opened again; the way to keep them is offered first.
 */
export function SignOutButton({ guest, className }: { guest: boolean; className: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <LogOut size={20} strokeWidth={1.75} />
        Sign out
      </button>
      {open && (
        <Dialog
          tone="clear"
          icon={LogOut}
          title={guest ? "Sign out of this guest account?" : "Sign out of Distill?"}
          detail={
            guest
              ? "A guest account has no password, so once you sign out its summaries can't be opened again."
              : "This device signs out. Your summaries stay in your account for the next time you sign in."
          }
          formAction={signOut}
          actions={
            <>
              <button type="button" onClick={() => setOpen(false)} className={keepButton} autoFocus>
                <X size={17} strokeWidth={2} className="text-brand-strong" />
                Stay
              </button>
              <PendingButton icon={<LogOut size={17} strokeWidth={2} />} label={guest ? "Sign out anyway" : "Sign out"} pendingLabel="Signing out" className={signOutButton} />
            </>
          }
        >
          {guest && (
            <Link
              href="/profile?dialog=keep"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl border border-input/35 bg-input-soft px-3.5 py-3 text-[13.5px] hover:border-input/60"
            >
              <UserRoundPlus size={18} strokeWidth={2} className="shrink-0 text-input" />
              <span className="min-w-0">
                <span className="block font-semibold text-input">Keep my summaries</span>
                <span className="block text-[12.5px] text-muted">Make a free account in one step; everything comes with you.</span>
              </span>
            </Link>
          )}
        </Dialog>
      )}
    </>
  );
}
