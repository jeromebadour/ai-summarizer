import { CircleCheck, Download, KeyRound, Laptop, LogOut, MapPin, Monitor, Smartphone, UserX, type LucideIcon } from "lucide-react";
import type { DeviceKind, SignedInDevice } from "@/lib/profile";

const deviceIcons: Record<DeviceKind, LucideIcon> = { desktop: Monitor, laptop: Laptop, phone: Smartphone };

function Card({ icon: Icon, tone, title, detail, action, children }: { icon: LucideIcon; tone: string; title: string; detail: string; action?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-panel">
      <div className="flex items-center gap-5 px-7 py-5">
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-panel-raised/60 ${tone}`}>
          <Icon size={19} strokeWidth={1.9} />
        </span>
        <div>
          <h3 className="text-[15px] font-semibold">{title}</h3>
          <p className="mt-0.5 text-[13px] text-muted">{detail}</p>
        </div>
        <div className="ml-auto">{action}</div>
      </div>
      {children}
    </section>
  );
}

const outline = "flex items-center gap-2 rounded-xl border py-2 pl-3 pr-4 text-[13px] font-semibold";

export function ProfileSecurity({ devices, passwordChanged }: { devices: SignedInDevice[]; passwordChanged: string }) {
  const others = devices.filter((device) => !device.current).length;

  return (
    <div className="space-y-5">
      <Card
        icon={KeyRound}
        tone="text-brand-strong"
        title="Password"
        detail={`Last changed ${passwordChanged}.`}
        action={
          <button type="button" className={`${outline} border-brand-line text-text hover:bg-brand-soft`}>
            <KeyRound size={16} strokeWidth={2} className="text-brand-strong" />
            Change
          </button>
        }
      />

      <Card
        icon={Monitor}
        tone="text-input"
        title="Signed-in devices"
        detail={`${devices.length} devices. Signing one out ends its session at once.`}
        action={
          others > 0 && (
            <button type="button" className={`${outline} border-clear/35 text-clear hover:bg-clear-soft`}>
              <LogOut size={16} strokeWidth={2} />
              Sign out others
            </button>
          )
        }
      >
        <ul className="border-t border-border">
          {devices.map((device) => {
            const Icon = deviceIcons[device.kind];
            return (
              <li key={device.id} className="flex items-center gap-5 border-b border-border px-7 py-4 last:border-b-0">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-input-soft text-input">
                  <Icon size={19} strokeWidth={1.9} />
                </span>
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold">
                    {device.browser} <span className="font-normal text-muted">on</span> {device.os}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[11.5px] text-muted">
                    <MapPin size={12} strokeWidth={2} className="text-input" />
                    {device.place}
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-4">
                  {device.current ? (
                    <span className="flex items-center gap-1.5 rounded-md border border-verify/30 bg-verify-soft px-2.5 py-1 text-[12px] font-semibold text-verify">
                      <CircleCheck size={14} strokeWidth={2.2} />
                      This device
                    </span>
                  ) : (
                    <>
                      <span className="font-mono text-[12px] text-muted">{device.lastActive}</span>
                      <button type="button" className="flex items-center gap-1.5 rounded-lg border border-clear/30 px-2.5 py-1.5 text-[12.5px] font-semibold text-clear hover:bg-clear-soft">
                        <LogOut size={14} strokeWidth={2} />
                        Sign out
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card
        icon={Download}
        tone="text-input"
        title="Your data"
        detail="Every summary with its source, points and figures, as one JSON file."
        action={
          <button type="button" className={`${outline} border-input/35 text-input hover:bg-input-soft`}>
            <Download size={16} strokeWidth={2} />
            Export
          </button>
        }
      />

      <section className="flex items-center gap-5 rounded-2xl border border-clear/30 bg-clear-soft/40 px-7 py-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-clear/35 bg-clear-soft text-clear">
          <UserX size={19} strokeWidth={1.9} />
        </span>
        <div>
          <h3 className="text-[15px] font-semibold">Delete account</h3>
          <p className="mt-0.5 text-[13px] text-muted">Removes your account, every summary and every session. This can&apos;t be undone.</p>
        </div>
        <button type="button" className="ml-auto flex items-center gap-2 rounded-xl bg-clear-strong py-2 pl-3 pr-4 text-[13px] font-semibold text-white hover:brightness-110">
          <UserX size={16} strokeWidth={2} />
          Delete account
        </button>
      </section>
    </div>
  );
}
