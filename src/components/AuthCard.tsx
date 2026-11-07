"use client";

import {
  AtSign,
  Eye,
  EyeOff,
  IdCard,
  LockKeyhole,
  LogIn,
  Mail,
  ShieldUser,
  UserRound,
  UserRoundPlus,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Field } from "@/components/Field";
import { PasswordCheck } from "@/components/PasswordCheck";
import { UsernameStatus } from "@/components/UsernameStatus";
import { checkUsernameFormat, type UsernameCheck } from "@/lib/username";

export type AuthMode = "signin" | "signup";

type AuthCardProps = {
  initialMode: AuthMode;
  initialName?: string;
  initialUsername?: string;
  initialUsernameStatus?: UsernameCheck;
  initialEmail?: string;
  initialPassword?: string;
};

export function AuthCard({
  initialMode,
  initialName = "",
  initialUsername = "",
  initialUsernameStatus,
  initialEmail = "",
  initialPassword = "",
}: AuthCardProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState(initialName);
  const [username, setUsername] = useState(initialUsername);
  const [usernameStatus, setUsernameStatus] = useState<UsernameCheck>(initialUsernameStatus ?? checkUsernameFormat(initialUsername));
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(initialPassword);
  const [showPassword, setShowPassword] = useState(false);
  const signin = mode === "signin";

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

      <form className="mt-6 space-y-4" onSubmit={(event) => event.preventDefault()}>
        {!signin && (
          <>
            <Field icon={IdCard} label="Name" type="text" placeholder="What should we call you?" value={name} onChange={setName} autoComplete="name" />
            <Field
              icon={AtSign}
              label="Username"
              type="text"
              placeholder="maya_k"
              value={username}
              onChange={(value) => {
                setUsername(value);
                setUsernameStatus(checkUsernameFormat(value));
              }}
              autoComplete="username"
              trailing={<UsernameStatus check={usernameStatus} />}
            />
          </>
        )}
        <Field
          icon={signin ? AtSign : Mail}
          label={signin ? "Email or username" : "Email"}
          type={signin ? "text" : "email"}
          placeholder={signin ? "you@company.com or maya_k" : "you@company.com"}
          value={email}
          onChange={setEmail}
          autoComplete={signin ? "username" : "email"}
        />
        <Field
          icon={LockKeyhole}
          label="Password"
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
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-[14.5px] font-semibold text-on-brand shadow-[0_6px_24px_-8px_var(--brand)] hover:brightness-110"
        >
          {signin ? <LogIn size={18} strokeWidth={2.1} /> : <UserRoundPlus size={18} strokeWidth={2.1} />}
          {signin ? "Sign in" : "Create account"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.12em] text-faint">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <button
        type="button"
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-input/40 bg-input-soft py-3 text-[14px] font-semibold text-input hover:border-input/70"
      >
        <UserRound size={18} strokeWidth={2} />
        Try it as a guest
      </button>
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
