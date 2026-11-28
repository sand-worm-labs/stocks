import type { Address, Hex } from "viem"
import { z } from "zod"

function hexOfBytes(bytes: number, what: string) {
  return z.string().regex(new RegExp(`^0x[0-9a-fA-F]{${bytes * 2}}$`), `must be ${what}`)
}

// The regex has checked the shape, so the casts only give the strings viem's types.
export const addressSchema = hexOfBytes(20, "a 0x address").transform((value) => value as Address)

// A private key, a pool id of Uniswap v4, a CREATE2 salt: all 32 bytes
export const bytes32Schema = hexOfBytes(32, "32 bytes of 0x hex").transform((value) => value as Hex)

export function isAddress(value: string): boolean {
  return addressSchema.safeParse(value).success
}

export function isBytes32(value: string): boolean {
  return bytes32Schema.safeParse(value).success
}
