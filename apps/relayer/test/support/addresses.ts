import type { Address } from "viem"

// A made-up address for a test: the number, padded to 20 bytes
export function addressOf(n: number): Address {
  return `0x${n.toString(16).padStart(40, "0")}`
}
