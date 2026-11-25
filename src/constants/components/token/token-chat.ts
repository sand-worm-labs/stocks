import { type ChatStatus } from "@/hooks/use-chat-room"

export const ALERTS_KEY = "sandworm-stocks:chat:trade-alerts"

export const STATUS_TEXT: Record<Exclude<ChatStatus, "live">, string> = {
  connecting: "Connecting…",
  offline: "Reconnecting…",
  unavailable: "Chat isn't connected",
}
