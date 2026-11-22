import type { Session } from "@/lib/session/types"

export const sessionMockData: Session = {
  user: { firstName: "Emmanuel" },
  network: { mode: "paper", chain: "Base Sepolia" },
  region: "Nigeria",
  wallet: "0x7a3f1234567890abcdef1234567890abcdefc21e",
  now: "2026-11-20T14:20:00",
  unreadAlerts: 2,
}
