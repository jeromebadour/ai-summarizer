export type PasswordRule = { id: "length" | "mix" | "notEmail"; label: string; met: boolean };

/** The same rules run in the browser (live feedback) and on the server (the real check). */
export function passwordRules(password: string, email: string): PasswordRule[] {
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  return [
    { id: "length", label: "At least 8 characters", met: password.length >= 8 },
    { id: "mix", label: "Letters and numbers", met: /[a-z]/i.test(password) && /\d/.test(password) },
    {
      id: "notEmail",
      label: "Not your email name",
      met: password.length > 0 && (local.length < 3 || !password.toLowerCase().includes(local)),
    },
  ];
}

export function passwordAccepted(password: string, email: string): boolean {
  return passwordRules(password, email).every((rule) => rule.met);
}
