import { CLERK_SESSION_COOKIE, THEME_STORAGE_KEY } from "@/lib/theme-constants";

/**
 * Runs before first paint so nobody sees the wrong theme flash (M73, M146).
 * A stored choice wins. Otherwise the default follows sign in state, read
 * from Clerk's `__client_uat` cookie (any cookie with that prefix whose
 * value is a non zero number means a session exists): light signed in,
 * dark signed out. No OS fallback. Kept tiny and dependency free on
 * purpose; lib/theme.ts owns the same rules for React.
 */
const SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var p=${JSON.stringify(CLERK_SESSION_COOKIE)};var t=localStorage.getItem(k);if(t!=="light"&&t!=="dark"){var s=false;var cs=document.cookie.split(";");for(var i=0;i<cs.length;i++){var c=cs[i].trim();if(c.indexOf(p)===0){var v=c.slice(c.indexOf("=")+1);if(v&&v!=="0"&&!isNaN(Number(v))){s=true;break;}}}t=s?"light":"dark";}var cl=document.documentElement.classList;cl.remove("dark","light");cl.add(t);document.documentElement.style.colorScheme=t;}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
