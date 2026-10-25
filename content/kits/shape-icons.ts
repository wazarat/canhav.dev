/**
 * The icons a shape can show (M177), by name. The names are what the kit
 * stores and the MCP takes; components/build/shape-icons.tsx maps each to
 * its lucide component. Order is picker order.
 */
export const SHAPE_ICON_NAMES = [
  "box", "layers", "blocks", "hexagon", "triangle", "circle", "square", "coins", "wallet", "landmark",
  "piggy-bank", "banknote", "circle-dollar-sign", "trending-up", "chart-line", "chart-column", "chart-pie", "percent", "scale", "shield",
  "shield-check", "lock", "key-round", "vault", "building", "briefcase", "gem", "droplet", "droplets", "waves",
  "flame", "zap", "rocket", "target", "compass", "globe", "map", "anchor", "repeat", "arrow-left-right",
  "shuffle", "refresh-cw", "link", "network", "workflow", "cpu", "database", "server", "code", "terminal",
  "bot", "sparkles", "star", "heart", "leaf", "sprout", "sun", "moon", "cloud", "umbrella",
  "gift", "trophy", "crown", "flag", "bell", "lightbulb", "puzzle", "hammer", "wrench", "factory",
  "store", "shopping-cart", "users", "handshake", "vote", "gavel", "file-text", "book-open", "calendar", "hourglass",
] as const;

export type ShapeIconName = (typeof SHAPE_ICON_NAMES)[number];

export function isShapeIconName(v: unknown): v is ShapeIconName {
  return typeof v === "string" && (SHAPE_ICON_NAMES as readonly string[]).includes(v);
}
