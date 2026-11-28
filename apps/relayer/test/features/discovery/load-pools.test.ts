import { mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { mirrorKeyOf } from "../../../src/common/pool-key.js"
import { loadPools } from "../../../src/features/discovery/load-pools.js"

const poolId = "0x" + "ab".repeat(12) + "cd".repeat(20)

async function fileWith(pools: unknown): Promise<string> {
  const file = join(await mkdtemp(join(tmpdir(), "pools-")), "pools.json")
  await writeFile(file, JSON.stringify(pools))
  return file
}

describe("mirrorKeyOf", () => {
  it("is the last 20 bytes of the pool id", () => {
    expect(mirrorKeyOf(poolId as `0x${string}`)).toBe("0x" + "cd".repeat(20))
  })
})

describe("loadPools", () => {
  it("reads a contract pool and a v4 pool side by side", async () => {
    const file = await fileWith([
      { name: "NVDAc", address: "0x" + "11".repeat(20), kind: "aerodrome-cl" },
      { name: "TSLAc", poolId, kind: "uniswap-v4" },
    ])
    const pools = await loadPools(file)
    expect(pools[0]).toMatchObject({ kind: "aerodrome-cl", address: "0x" + "11".repeat(20) })
    expect(pools[1]).toMatchObject({ kind: "uniswap-v4", poolId, address: "0x" + "cd".repeat(20) })
  })

  it("refuses a v4 pool with no id, and a contract pool with no address", async () => {
    await expect(loadPools(await fileWith([{ name: "TSLAc", kind: "uniswap-v4" }]))).rejects.toThrow()
    await expect(loadPools(await fileWith([{ name: "NVDAc", kind: "uniswap-v3" }]))).rejects.toThrow()
  })
})
