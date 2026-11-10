"use client";

import { ArrowLeft, Eye, EyeOff, KeyRound, LoaderCircle, LockKeyhole, LogIn, Mail, MailCheck, MailOpen, RotateCw, Send, TimerOff } from "@/components/glyphs";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { signOut } from "@/app/actions/auth";
import { cancelEmailChange, checkResetCode, resendVerify, saveNewPassword, sendReset, verifyCode, verifyLink } from "@/app/actions/email";
import { AuthStep } from "@/components/AuthStep";
import { CodeEntry } from "@/components/CodeEntry";
import { Field } from "@/components/Field";
import { FormAlert } from "@/components/FormAlert";
import Link from "@/components/NavLink";
import { PasswordCheck } from "@/components/PasswordCheck";
import { PendingButton } from "@/components/PendingButton";

const primary =
  "flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-[14.5px] font-semibold text-on-brand shadow-[0_6px_24px_-8px_var(--brand)] hover:brightness-110";
const quiet =
  "flex w-full items-center justify-center gap-2 rounded-xl border border-input/40 bg-input-soft py-3 text-[14px] font-semibold text-input hover:border-input/70";
const backLink = "inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-strong hover:text-text";

/** Waits before another code can be sent, and says so (never a button that silently does nothing). */
function useCooldown(start: number) {
  const [left, setLeft] = useState(start);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return [left, () => setLeft(60)] as const;
}

/**
 * After sign-up, a guest upgrade or an email change: the code confirms the address, or the email's button does. If
 * the email is confirmed elsewhere (the link in another tab, on a phone), this screen notices within a few seconds and
 * moves on by itself.
 */
export function CheckInbox({ email, live, change }: { email: string; live: boolean; change: boolean }) {
  const router = useRouter();
  const [verifyState, verify] = useActionState(verifyCode, undefined);
  const [resendState, resend] = useActionState(resendVerify, undefined);
  // A code that is still live was just sent: wait a minute before another. None live: send one straight away.
  const [left, restart] = useCooldown(live ? 60 : 0);
  const restartRef = useRef(restart);
  useEffect(() => {
    restartRef.current = restart;
  });
  useEffect(() => {
    if (resendState?.code === "nothing") restartRef.current();
  }, [resendState]);
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [router]);

  return (
    <AuthStep
      icon={MailOpen}
      tone="arriving"
      title="Check your inbox"
      lead={
        <>
          {live ? "We sent" : "We'll send"} a 6-digit code to <span className="font-semibold text-text">{email}</span>. Type it
          here, or click the button in the email.
        </>
      }
      footer={
        <form action={change ? cancelEmailChange : signOut}>
          <button type="submit" className={backLink}>
            <ArrowLeft size={15} strokeWidth={2.1} />
            {change ? "Keep my current email" : "Use a different email"}
          </button>
        </form>
      }
    >
      <form action={verify} className="space-y-4">
        <CodeEntry />
        {verifyState?.error && <FormAlert message={verifyState.error} />}
        <PendingButton icon={<MailCheck size={18} strokeWidth={2.1} />} label="Verify email" pendingLabel="Checking the code" className={primary} />
      </form>
      <form action={resend} className="space-y-3">
        <PendingButton
          icon={<RotateCw size={17} strokeWidth={2} />}
          label={left > 0 ? `Send a new code in ${left} s` : live ? "Send a new code" : "Send the code"}
          pendingLabel="Sending a new code"
          disabled={left > 0}
          className={`${quiet} disabled:border-border disabled:bg-transparent disabled:text-muted`}
        />
        {resendState?.error && <FormAlert message={resendState.error} />}
      </form>
      <p className="text-center font-mono text-[11px] text-muted">The code works for 24 hours · nothing in a few minutes? Check spam</p>
    </AuthStep>
  );
}

/**
 * The email's button lands here. Opening the page confirms nothing (mail scanners open links on their own); it posts
 * the token a moment after loading, which scanners don't do, and the button is there if that doesn't happen.
 */
export function ConfirmLink({ token }: { token: string }) {
  const form = useRef<HTMLFormElement>(null);
  const [sending, setSending] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => {
      setSending(true);
      form.current?.requestSubmit();
    }, 400);
    return () => clearTimeout(t);
  }, []);
  return (
    <AuthStep icon={MailCheck} tone="done" title="Confirming your email" lead="One moment: this signs you in and opens Distill.">
      <form ref={form} action={verifyLink} onSubmit={() => setSending(true)}>
        <input type="hidden" name="token" value={token} />
        <button type="submit" disabled={sending} className={`${primary} disabled:cursor-progress`}>
          {sending ? <LoaderCircle size={18} strokeWidth={2.1} className="animate-spin" /> : <MailCheck size={18} strokeWidth={2.1} />}
          {sending ? "Confirming" : "Confirm my email"}
        </button>
      </form>
    </AuthStep>
  );
}

/** A link or code that was used already, or ran out: calm, with the way forward. */
export function LinkExpired({ what, signedIn = false }: { what: "verify" | "reset"; signedIn?: boolean }) {
  const [state, again] = useActionState(resendVerify, undefined);
  return (
    <AuthStep
      icon={TimerOff}
      tone="calm"
      title="This link has run out"
      lead={
        what === "verify"
          ? "Links to confirm an email work once, for 24 hours. Send yourself a new one."
          : "Links to set a new password work once, for 30 minutes. Ask for a new one."
      }
      back={{ href: "/login", label: "Back to sign in" }}
    >
      {what === "reset" ? (
        <Link href="/forgot" className={primary}>
          <KeyRound size={17} strokeWidth={2.1} />
          Ask for a new link
        </Link>
      ) : signedIn ? (
        <form action={again} className="space-y-3">
          <PendingButton icon={<Send size={17} strokeWidth={2.1} />} label="Send a new link" pendingLabel="Sending" className={primary} />
          {state?.code === "nothing" && <p className="text-[13px] text-input">Sent. Check your inbox.</p>}
          {state?.error && <FormAlert message={state.error} />}
        </form>
      ) : (
        <Link href="/login" className={primary}>
          <LogIn size={17} strokeWidth={2.1} />
          Sign in for a new link
        </Link>
      )}
    </AuthStep>
  );
}

/**
 * "Forgot password": afterwards, the same answer whether or not the email has an account (nobody can test which
 * emails are registered). The code, or the email's button, opens Set a new password.
 */
export function ForgotPassword({ sent }: { sent: boolean }) {
  const [email, setEmail] = useState("");
  const [sendState, send] = useActionState(sendReset, undefined);
  const [checkState, check] = useActionState(checkResetCode, undefined);
  if (sent) {
    return (
      <AuthStep
        icon={MailOpen}
        tone="arriving"
        title="Check your inbox"
        lead="If an account uses that email, a code and a link to set a new password are on their way. They work once, for 30 minutes."
        back={{ href: "/forgot", label: "Use a different email" }}
      >
        <form action={check} className="space-y-4">
          <CodeEntry />
          {checkState?.error && <FormAlert message={checkState.error} />}
          <PendingButton icon={<KeyRound size={17} strokeWidth={2.1} />} label="Continue" pendingLabel="Checking the code" className={primary} />
        </form>
        <p className="text-center font-mono text-[11px] text-muted">Nothing in a few minutes? Check spam, or ask again.</p>
      </AuthStep>
    );
  }
  return (
    <AuthStep
      icon={KeyRound}
      tone="calm"
      title="Forgot your password?"
      lead="Enter the email on your account and we'll send you a code and a link to set a new one."
      back={{ href: "/login", label: "Back to sign in" }}
    >
      <form action={send} className="space-y-4">
        <Field icon={Mail} label="Email" name="email" type="email" placeholder="you@company.com" value={email} onChange={setEmail} autoComplete="email" />
        {sendState?.error && <FormAlert message={sendState.error} />}
        <PendingButton icon={<Send size={17} strokeWidth={2.1} />} label="Send the code" pendingLabel="Sending" className={primary} />
      </form>
    </AuthStep>
  );
}

/** From the reset email or code: a new password, checked like at sign-up. Every other device is signed out. */
export function SetNewPassword({ email, token }: { email: string; token: string }) {
  const [password, setPassword] = useState("");
  const [shown, setShown] = useState(false);
  const [state, save] = useActionState(saveNewPassword, undefined);
  return (
    <AuthStep
      icon={LockKeyhole}
      tone="calm"
      title="Set a new password"
      lead={
        <>
          For <span className="font-semibold text-text">{email}</span>. Every other device will be signed out.
        </>
      }
      back={{ href: "/login", label: "Back to sign in" }}
    >
      <form action={save} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <Field
          icon={LockKeyhole}
          label="New password"
          name="password"
          type={shown ? "text" : "password"}
          placeholder="Choose a password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          trailing={
            <button type="button" aria-label={shown ? "Hide password" : "Show password"} onClick={() => setShown((s) => !s)} className="text-muted hover:text-text">
              {shown ? <EyeOff size={17} strokeWidth={2} /> : <Eye size={17} strokeWidth={2} />}
            </button>
          }
        />
        <PasswordCheck password={password} email={email} />
        {state?.error && <FormAlert message={state.error} />}
        <PendingButton icon={<LockKeyhole size={17} strokeWidth={2.1} />} label="Save and sign in" pendingLabel="Saving your password" className={primary} />
      </form>
    </AuthStep>
  );
}
