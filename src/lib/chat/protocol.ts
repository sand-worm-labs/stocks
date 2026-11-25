import { z } from "zod"

export const MAX_LENGTH = 280

export type ChatMessage = { id: string; at: number; userId: string; name: string; text: string }

// What the browser sends: only what it wants to say. Who it is comes from the ticket, never from the message.
export const sayMessage = z.object({ type: z.literal("say"), text: z.string() })

export type ServerEvent =
  | { type: "hello"; me: { id: string; name: string }; history: ChatMessage[]; online: number }
  | { type: "message"; message: ChatMessage }
  | { type: "online"; count: number }
  | { type: "error"; reason: string }

export const isRoom = (value: string | null): value is string => /^0x[0-9a-f]{40}$/.test(value ?? "")

export const cleanText = (text: string) =>
  text
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_LENGTH) || undefined

export function nameOf(userId: string) {
  let hash = 0
  for (const char of userId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return `Trader ${hash.toString(16).padStart(4, "0").slice(-4)}`
}
