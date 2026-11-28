import type { Address, Hex, PublicClient } from "viem"
import { describe, expect, it } from "vitest"
import { addressOf as address } from "../../support/addresses.js"
import type { Pool } from "../../../src/common/pool.type.js"
import { readMainnet } from "../../../src/infrastructure/base-mainnet/read-mainnet.js"

const poolId = `0x${"cd".repeat(32)}` as Hex

const uniswapV3: Pool = { name: "A", address: address(1), kind: "uniswap-v3" }
const slipstream: Pool = { name: "B", address: address(2), kind: "aerodrome-cl" }
const uniswapV4: Pool = { name: "C", address: address(3), kind: "uniswap-v4", poolId }

type Call = { address: Address; functionName: string; args?: readonly unknown[] }

// A mainnet that answers every call with a price of tick 7 and a depth of 1000, except for the pools named in `broken`
function fakeMainnet(broken: Address[] = []) {
  const calls: Call[][] = []
  const client = {
    getBlockNumber: async () => 500n,
    multicall: async ({ contracts }: { contracts: Call[] }) => {
      calls.push(contracts)
      return contracts.map((call) => {
        if (broken.includes(call.address)) return { status: "failure", error: new Error("reverted") }
        const isPrice = call.functionName === "slot0" || call.functionName === "getSlot0"
        return { status: "success", result: isPrice ? [2n ** 96n, 7, 0, 0] : 1000n }
      })
    },
  }
  return { client: client as unknown as PublicClient, calls }
}

describe("readMainnet", () => {
  it("reads every kind of pool at one block", async () => {
    const { client } = fakeMainnet()
    const { mainnetBlock, states, unreadable } = await readMainnet(client, [uniswapV3, slipstream, uniswapV4])

    expect(mainnetBlock).toBe(500n)
    expect(unreadable).toEqual([])
    expect([...states.keys()]).toEqual([address(1), address(2), address(3)])
    expect(states.get(address(3))).toEqual({ sqrtPriceX96: 2n ** 96n, tick: 7, liquidity: 1000n, mainnetBlock: 500n })
  })

  it("asks a v4 pool by its id, through the StateView contract", async () => {
    const { client, calls } = fakeMainnet()
    await readMainnet(client, [uniswapV4])

    const asked = calls.flat()
    expect(asked.map((call) => call.functionName).sort()).toEqual(["getLiquidity", "getSlot0"])
    expect(asked.every((call) => call.args?.[0] === poolId)).toBe(true)
  })

  it("reports a pool that does not answer and still reads the others", async () => {
    const { client } = fakeMainnet([address(2)])
    const { states, unreadable } = await readMainnet(client, [uniswapV3, slipstream, uniswapV4])

    expect(unreadable).toEqual([slipstream])
    expect([...states.keys()]).toEqual([address(1), address(3)])
  })

  it("makes no request for a kind of pool it has none of", async () => {
    const { client, calls } = fakeMainnet()
    await readMainnet(client, [uniswapV3])
    expect(calls).toHaveLength(2)
  })
})
