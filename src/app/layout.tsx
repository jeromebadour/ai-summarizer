import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Distill",
  description: "Paste text, get a traceable summary from Claude, keep your summaries.",
};

/**
 * Runs before first paint so there is no flash: a saved Light / Dark choice wins; otherwise (System) the theme
 * follows the device and keeps following it if the device switches. It also leaves the viewer's time zone in a `tz`
 * cookie, so the server shows "today", times and daily charts in the viewer's zone, not the box's UTC.
 */
const themeScript = `(function(){var m=matchMedia("(prefers-color-scheme: light)");function saved(){try{var t=localStorage.getItem("theme");return t==="light"||t==="dark"?t:null}catch(e){return null}}function apply(){document.documentElement.dataset.theme=saved()||(m.matches?"light":"dark")}apply();m.addEventListener("change",apply);try{var z=Intl.DateTimeFormat().resolvedOptions().timeZone;if(z&&document.cookie.indexOf("tz="+encodeURIComponent(z))<0)document.cookie="tz="+encodeURIComponent(z)+";path=/;max-age=31536000;samesite=lax"}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
