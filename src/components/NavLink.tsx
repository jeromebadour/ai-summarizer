import NextLink from "next/link";
import type { ComponentProps } from "react";
import { LinkPending } from "@/components/LinkPending";

/**
 * Every in-app link: Next's Link, plus the pressed-at-once mark. A tab or rail item lights up on the click itself, and
 * the page below dims a little until the new one arrives (never a frozen screen while the server answers).
 */
export default function Link({ children, ...props }: ComponentProps<typeof NextLink>) {
  return (
    <NextLink {...props}>
      {children}
      <LinkPending />
    </NextLink>
  );
}
