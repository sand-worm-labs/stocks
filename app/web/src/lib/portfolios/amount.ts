export type AmountReading = {
  amount?: number
  fraction: number
  error?: string
}

type AmountRules = {
  min: number
  max: number
  under?: (least: number) => string
  over?: (most: number) => string
}

const CENT = 0.005

// What was typed as an amount of money, read against the least and the most it can be. When the most is under the least, the
// most is the only amount that will do.
export function readAmount(text: string, { min, max, under, over }: AmountRules): AmountReading {
  const least = Math.min(min, max)
  const amount = Number(text.replace(/,/g, ""))
  if (text.trim() === "" || !Number.isFinite(amount)) return { fraction: 0, error: "Enter an amount" }
  if (amount < least - CENT) return { fraction: 0, error: under?.(least) ?? `The least is ${least.toFixed(2)} USDC` }
  if (amount > max + CENT) return { fraction: 0, error: over?.(max) ?? `The most is ${max.toFixed(2)} USDC` }

  return { amount, fraction: max ? Math.min(amount / max, 1) : 0 }
}
