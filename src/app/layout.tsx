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
 * follows the device and keeps following it if the device switches.
 */
const themeScript = `(function(){var m=matchMedia("(prefers-color-scheme: light)");function saved(){try{var t=localStorage.getItem("theme");return t==="light"||t==="dark"?t:null}catch(e){return null}}function apply(){document.documentElement.dataset.theme=saved()||(m.matches?"light":"dark")}apply();m.addEventListener("change",apply)})()`;

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
