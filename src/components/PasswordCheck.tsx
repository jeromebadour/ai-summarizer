import { Circle, CircleCheck } from "@/components/glyphs";
import { passwordRules } from "@/lib/password";

const strengthLooks = [
  { label: "Too weak", bar: "bg-flag", text: "text-flag" },
  { label: "Too weak", bar: "bg-flag", text: "text-flag" },
  { label: "Almost", bar: "bg-figure", text: "text-figure" },
  { label: "Good", bar: "bg-verify", text: "text-verify" },
];

export function PasswordCheck({ password, email }: { password: string; email: string }) {
  const rules = passwordRules(password, email);
  const met = rules.filter((rule) => rule.met).length;
  const look = strengthLooks[met];

  return (
    <div aria-live="polite" className="rounded-xl border border-border bg-panel-raised/40 px-3.5 py-3">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1.5">
          {rules.map((rule, index) => (
            <span key={rule.id} className={`h-1.5 flex-1 rounded-full ${index < met ? look.bar : "bg-border-strong"}`} />
          ))}
        </div>
        <span className={`font-mono text-[11.5px] font-semibold ${password ? look.text : "text-faint"}`}>{password ? look.label : "Waiting"}</span>
      </div>
      <ul className="mt-2.5 space-y-1">
        {rules.map((rule) => (
          <li key={rule.id} className={`flex items-center gap-2 text-[12.5px] ${rule.met ? "text-verify" : "text-muted"}`}>
            {rule.met ? <CircleCheck size={14} strokeWidth={2.2} /> : <Circle size={14} strokeWidth={2} className="text-faint" />}
            {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
