import Link from "next/link";
import type { ReactNode } from "react";

/** Renders the two marks the legal text uses: **bold** and [label](href). Internal links stay in the app. */
export function RichText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  const pattern = /\*\*(.+?)\*\*|\[(.+?)\]\((.+?)\)/g;
  let last = 0;
  for (const m of text.matchAll(pattern)) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) {
      parts.push(<strong key={m.index} className="font-semibold text-text">{m[1]}</strong>);
    } else {
      const href = m[3];
      const className = "font-medium text-brand-strong underline decoration-brand-line underline-offset-4 hover:decoration-brand-strong";
      parts.push(
        href.startsWith("/") ? (
          <Link key={m.index} href={href as never} className={className}>{m[2]}</Link>
        ) : (
          <a key={m.index} href={href} className={className} {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>{m[2]}</a>
        ),
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}
