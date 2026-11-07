import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type FieldProps = {
  icon: LucideIcon;
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  trailing?: ReactNode;
  /** The form field name, so a form action receives the value. */
  name?: string;
};

export function Field({ icon: Icon, label, type, placeholder, value, onChange, autoComplete, trailing, name }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-semibold text-muted">{label}</span>
      <span className="flex items-center gap-2.5 rounded-xl border border-border-strong bg-paper px-3.5 py-3 focus-within:border-brand-line">
        <Icon size={17} strokeWidth={2} className="text-brand-strong" />
        <input
          type={type}
          name={name}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="min-w-0 flex-1 bg-transparent text-[14px] text-text outline-none placeholder:text-faint"
        />
        {trailing}
      </span>
    </label>
  );
}
