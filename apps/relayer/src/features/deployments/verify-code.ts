import { readFile } from "node:fs/promises"
import { join } from "node:path"
import type { Address, Hex, PublicClient } from "viem"
import { z } from "zod"

// What forge writes of a contract: the code it leaves on a chain, and where in it a constructor's immutable values are put
const artifactSchema = z.object({
  deployedBytecode: z.object({
    object: z.string(),
    immutableReferences: z.record(z.array(z.object({ start: z.number(), length: z.number() }))).default({}),
  }),
})

type Reference = { start: number; length: number }

export type CodeCheck = { name: string; address: Address; isRight: boolean; reason?: string }

// Zeroes the bytes a constructor fills in, so two deployments of one contract with different arguments read the same
export function maskImmutables(code: Hex, references: Reference[]): string {
  const bytes = code.slice(2).split("")
  for (const { start, length } of references) {
    for (let index = start * 2; index < (start + length) * 2; index++) bytes[index] = "0"
  }
  return bytes.join("").toLowerCase()
}

// Whether the code at an address is the code of the named contract in `apps/contracts`, as compiled now
export async function verifyCode(client: PublicClient, name: string, address: Address, contractsOut: string): Promise<CodeCheck> {
  const artifact = artifactSchema.parse(JSON.parse(await readFile(join(contractsOut, `${name}.sol`, `${name}.json`), "utf8")))
  const onChain = await client.getCode({ address })
  if (!onChain || onChain === "0x") return { name, address, isRight: false, reason: "there is no code at this address" }

  const expected = artifact.deployedBytecode.object as Hex
  const references = Object.values(artifact.deployedBytecode.immutableReferences).flat()
  const isRight = maskImmutables(onChain, references) === maskImmutables(expected, references)
  return isRight ? { name, address, isRight } : { name, address, isRight, reason: "the code is not the code of the contract as compiled now" }
}
