import type { ReactNode } from "react";

/**
 * A wide table on a phone: its header and rows scroll sideways together inside the card, at the width they need
 * (`minWidth`), so no column is squeezed or dropped. On laptops and up the wrappers vanish (`display: contents`) and
 * the table lays out exactly as before.
 */
export function PhoneScroll({ minWidth, children }: { minWidth: string; children: ReactNode }) {
  return (
    <div className="contents max-md:-mx-3 max-md:block max-md:overflow-x-auto max-md:px-3 max-md:[scrollbar-width:thin]">
      <div className={`contents max-md:flex max-md:flex-col max-md:gap-3 ${minWidth}`}>{children}</div>
    </div>
  );
}
