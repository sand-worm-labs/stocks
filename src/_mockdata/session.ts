import type { Session } from "@/lib/session/types"

export const sessionMockData: Session = {
  user: { firstName: "Emmanuel" },
  network: { mode: "paper", chain: "Base Sepolia" },
  region: "NG",
  onboarded: false,
  welcomePending: false,
  interests: [],
  now: "2026-11-20T14:20:00",
}
