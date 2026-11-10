import type { Metadata } from "next";
import "@fontsource-variable/schibsted-grotesk";
import "@fontsource/fragment-mono";
import "./globals.css";
import { Suspense } from "react";
import { Notice } from "@/components/Notice";

export const metadata: Metadata = {
  title: "Distill",
  description: "Paste text, get a traceable summary from Claude, keep your summaries.",
};

/**
 * Runs before first paint so there is no flash: a saved Light / Dark choice wins; otherwise (System) the theme
 * follows the device and keeps following it if the device switches. It also leaves the viewer's time zone in a `tz`
 * cookie, so the server shows "today", times and daily charts in the viewer's zone, not the box's UTC. The window's
 * height and width go in the `vh` and `vw` cookies (kept up to date on resize), so lists are paged to fit the window. A saved Motion
 * choice (Full / Reduced) is applied the same way, before first paint.
 */
const themeScript = `(function(){var m=matchMedia("(prefers-color-scheme: light)");function saved(){try{var t=localStorage.getItem("theme");return t==="light"||t==="dark"?t:null}catch(e){return null}}function apply(){document.documentElement.dataset.theme=saved()||(m.matches?"light":"dark")}apply();m.addEventListener("change",apply);try{var mo=localStorage.getItem("motion");if(mo==="full"||mo==="reduced")document.documentElement.dataset.motion=mo}catch(e){}try{var z=Intl.DateTimeFormat().resolvedOptions().timeZone;if(z&&document.cookie.indexOf("tz="+encodeURIComponent(z))<0)document.cookie="tz="+encodeURIComponent(z)+";path=/;max-age=31536000;samesite=lax"}catch(e){}function vh(){document.cookie="vh="+innerHeight+";path=/;max-age=31536000;samesite=lax";document.cookie="vw="+innerWidth+";path=/;max-age=31536000;samesite=lax"}vh();var t;addEventListener("resize",function(){clearTimeout(t);t=setTimeout(vh,300)})})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        {children}
        {/* What a finished step says after its redirect (?done=...), on any page. */}
        <Suspense fallback={null}>
          <Notice />
        </Suspense>
      </body>
    </html>
  );
}
