import type { BuyStep } from "@/types/ui"

export const STEP_TEXT: Record<Exclude<BuyStep, "idle">, string> = {
  switching: "Switching network…",
  signing: "Approve in your wallet…",
  checking: "Checking your approval…",
}

export const CELL = "border-border-secondary dark:border-border-tertiary border-t py-2.5 text-right tabular-nums"

export const FAUCET_URL = "https://faucet.circle.com"
