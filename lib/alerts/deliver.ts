/**
 * The worker's delivery code, shared with the app (M128) for the test alert
 * and the Discord hello. Pure fetch, no framework imports.
 */
export { deliver, type Delivery, type DeliveryEnv, telegramParts } from "@/alerts/src/deliver";
