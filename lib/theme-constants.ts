/**
 * Theme constants shared by server and client code (M73). lib/theme.ts is
 * a client module, and a server component importing a constant from it
 * gets a client reference, not the value, so the plain values live here.
 */

export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "canhav-theme";

/** Browser chrome colours per theme (meta theme-color and the viewport). */
export const THEME_COLOR: Record<Theme, string> = {
  dark: "#05060A",
  light: "#F5F5F7",
};
