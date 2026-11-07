"use client";

import {
  AtSign,
  Eye,
  EyeOff,
  IdCard,
  Info,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  Mail,
  ShieldUser,
  TriangleExclamationPoint,
  UserRound,
  UserRoundPlus,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { signIn, signUp, startGuest, usernameFree, type AuthState } from "@/app/actions/auth";
import { Field } from "@/components/Field";
import { PasswordCheck } from "@/components/PasswordCheck";
import { UsernameStatus } from "@/components/UsernameStatus";
import { checkUsernameFormat, type UsernameCheck } from "@/lib/username";

export type AuthMode = "signin" | "signup";

export function AuthCard({ initialMode }: { initialMode: AuthMode }) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<UsernameCheck>({ status: "empty" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [signInState, signInAction] = useActionState<AuthState, FormData>(signIn, undefined);
  const [signUpState, signUpAction] = useActionState<AuthState, FormData>(signUp, undefined);
  const signin = mode === "signin";
  const state = signin ? signInState : signUpState;

  // The server answers whether a well-formed username is free, a moment after typing stops.
  useEffect(() => {
    if (usernameStatus.status !== "checking") return;
    let live = true;
    const timer = setTimeout(async () => {
      const free = await usernameFree(username);
      if (live && free !== null) setUsernameStatus({ status: free ? "available" : "taken" });
    }, 350);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [username, usernameStatus.status]);

  // A server refusal for the username (taken in a race) shows in the field's own status.
  const shownUsernameStatus: UsernameCheck =
    !signin && signUpState?.field === "username" && signUpState.error === "That username is taken" && usernameStatus.status !== "checking"
      ? { status: "taken" }
      : usernameStatus;

  return (
    <div className="w-[400px]">
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-paper p-1">
        {(["signin", "signup"] as const).map((key) => {
          const Icon = key === "signin" ? LogIn : UserRoundPlus;
          const active = key === mode;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => setMode(key)}
              className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-[13.5px] font-semibold transition-colors ${
                active ? "bg-brand text-on-brand" : "text-muted hover:bg-panel-raised hover:text-text"
              }`}
            >
              <Icon size={16} strokeWidth={2} />
              {key === "signin" ? "Sign in" : "Create account"}
            </button>
          );
        })}
      </div>

      <form key={mode} action={signin ? signInAction : signUpAction} className="mt-6 space-y-4">
        {!signin && (
          <>
            <Field icon={IdCard} label="Name" name="name" type="text" placeholder="What should we call you?" value={name} onChange={setName} autoComplete="name" />
            <Field
              icon={AtSign}
              label="Username"
              name="username"
              type="text"
              placeholder="maya_k"
              value={username}
              onChange={(value) => {
                setUsername(value);
                setUsernameStatus(checkUsernameFormat(value));
              }}
              autoComplete="username"
              trailing={<UsernameStatus check={shownUsernameStatus} />}
            />
          </>
        )}
        <Field
          icon={signin ? AtSign : Mail}
          label={signin ? "Email or username" : "Email"}
          name={signin ? "identifier" : "email"}
          type={signin ? "text" : "email"}
          placeholder={signin ? "you@company.com or maya_k" : "you@company.com"}
          value={email}
          onChange={setEmail}
          autoComplete={signin ? "username" : "email"}
        />
        <Field
          icon={LockKeyhole}
          label="Password"
          name="password"
          type={showPassword ? "text" : "password"}
          placeholder={signin ? "Your password" : "Choose a password"}
          value={password}
          onChange={setPassword}
          autoComplete={signin ? "current-password" : "new-password"}
          trailing={
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((shown) => !shown)}
              className="text-muted hover:text-text"
            >
              {showPassword ? <EyeOff size={17} strokeWidth={2} /> : <Eye size={17} strokeWidth={2} />}
            </button>
          }
        />
        {!signin && <PasswordCheck password={password} email={email} />}
        {state?.error && (
          <p
            role="alert"
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-semibold ${
              // An existing account is a normal state with a way forward (calm indigo); real refusals are amber.
              state.code === "email_exists" ? "border-brand-line bg-brand-soft text-brand-strong" : "border-flag/30 bg-flag-soft text-flag"
            }`}
          >
            {state.code === "email_exists" ? (
              <Info size={15} strokeWidth={2.2} className="shrink-0" />
            ) : (
              <TriangleExclamationPoint size={15} strokeWidth={2.2} className="shrink-0" />
            )}
            <span className="flex-1">{state.error}</span>
            {!signin && state.code === "email_exists" && (
              <button
                type="button"
                onClick={() => {
                  // The email is already in the shared field, so Sign in opens with it filled in.
                  setPassword("");
                  setMode("signin");
                }}
                className="flex shrink-0 items-center gap-1.5 rounded-md bg-brand px-2.5 py-1 text-[12.5px] font-semibold text-on-brand hover:brightness-110"
              >
                <LogIn size={14} strokeWidth={2.2} />
                Sign in instead
              </button>
            )}
          </p>
        )}
        <SubmitButton signin={signin} />
      </form>

      <div className="my-6 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.12em] text-faint">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <form action={startGuest}>
        <GuestButton />
      </form>
      <p className="mt-2.5 text-center font-mono text-[11px] text-muted">No account needed · 5 summaries an hour</p>

      <Link
        href="/demo/admin"
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-figure/40 bg-figure-soft py-3 text-[14px] font-semibold text-figure hover:border-figure/70"
      >
        <ShieldUser size={18} strokeWidth={2} />
        View the admin demo
      </Link>
      <p className="mt-2.5 text-center font-mono text-[11px] text-muted">The owner&apos;s console · invented data · read-only</p>
    </div>
  );
}

function SubmitButton({ signin }: { signin: boolean }) {
  const { pending } = useFormStatus();
  const Icon = pending ? LoaderCircle : signin ? LogIn : UserRoundPlus;
  const label = pending ? (signin ? "Signing in" : "Creating your account") : signin ? "Sign in" : "Create account";
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-[14.5px] font-semibold text-on-brand shadow-[0_6px_24px_-8px_var(--brand)] hover:brightness-110 disabled:cursor-progress"
    >
      <Icon size={18} strokeWidth={2.1} className={pending ? "animate-spin" : undefined} />
      {label}
    </button>
  );
}

function GuestButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-input/40 bg-input-soft py-3 text-[14px] font-semibold text-input hover:border-input/70 disabled:cursor-progress"
    >
      {pending ? <LoaderCircle size={18} strokeWidth={2} className="animate-spin" /> : <UserRound size={18} strokeWidth={2} />}
      {pending ? "Starting a guest session" : "Try it as a guest"}
    </button>
  );
}
