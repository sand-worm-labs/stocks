import type { Hex, PublicClient } from "viem"
import { mkdtemp, mkdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { maskImmutables, verifyCode } from "../../../src/features/deployments/verify-code.js"
import { addressOf } from "../../support/addresses.js"

// Four bytes of code, the middle two a constructor's immutable
const compiled = "0xaa0000dd" as Hex

async function outWith(name: string, object: string, immutableReferences: Record<string, { start: number; length: number }[]>): Promise<string> {
  const out = await mkdtemp(join(tmpdir(), "out-"))
  await mkdir(join(out, `${name}.sol`))
  await writeFile(join(out, `${name}.sol`, `${name}.json`), JSON.stringify({ deployedBytecode: { object, immutableReferences } }))
  return out
}

const chainWith = (code: Hex | undefined) => ({ getCode: async () => code }) as unknown as PublicClient

describe("maskImmutables", () => {
  it("zeroes the bytes a constructor fills in, and nothing else", () => {
    expect(maskImmutables("0xaabbccdd", [{ start: 1, length: 2 }])).toBe("aa0000dd")
    expect(maskImmutables("0xAABBCCDD", [])).toBe("aabbccdd")
  })
})

describe("verifyCode", () => {
  it("accepts the compiled contract, whatever its constructor put in the immutables", async () => {
    const out = await outWith("Thing", compiled, { "1": [{ start: 1, length: 2 }] })
    expect(await verifyCode(chainWith("0xaa1234dd"), "Thing", addressOf(1), out)).toMatchObject({ isRight: true })
  })

  it("refuses other code, and an address with none", async () => {
    const out = await outWith("Thing", compiled, { "1": [{ start: 1, length: 2 }] })
    expect(await verifyCode(chainWith("0xbb0000dd"), "Thing", addressOf(1), out)).toMatchObject({ isRight: false, reason: expect.stringContaining("not the code") })
    expect(await verifyCode(chainWith("0x"), "Thing", addressOf(1), out)).toMatchObject({ isRight: false, reason: expect.stringContaining("no code") })
  })
})
