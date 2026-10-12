import { THEME_STORAGE_KEY } from "@/lib/theme-constants";

/**
 * Runs before first paint so a visitor who chose light never sees a dark
 * flash (M73). Reads the stored choice, falls back to the OS setting, and
 * swaps the html class the server rendered. Kept tiny and dependency free
 * on purpose; lib/theme.ts owns the same rules for React.
 */
const SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var t=localStorage.getItem(k);if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";}var c=document.documentElement.classList;c.remove("dark","light");c.add(t);document.documentElement.style.colorScheme=t;}catch(e){}})();`; // copy-ok, a media query inside a script

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
