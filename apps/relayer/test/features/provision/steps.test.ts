import { zeroAddress, type Address, type Hex } from "viem"
import { describe, expect, it } from "vitest"
import { addressOf as address } from "../../support/addresses.js"
import type { Plan } from "../../../src/features/provision/plan.js"
import { build, type Chain } from "../../../src/features/provision/steps.js"

const STOCK = address(1)
const POOL = address(2)

const plan: Plan = {
  symbol: "NVDAc",
  testSymbol: "tNVDAc",
  testName: "Test NVDAc",
  mainnetPool: address(3),
  stockIsToken0: false,
  tickSpacing: 100,
  feeBps: 5,
  usdcSeed: 500n,
  stockSeed: 700n,
}

// A chain where the faucet, the factory and the balances are plain variables, and every call a step sends is written down
function fakeChain(start: { stock?: Address; pool?: Address; usdcInPool?: bigint; stockInPool?: bigint } = {}) {
  const sent: { functionName: string; args: readonly unknown[] }[] = []
  const state = { stock: start.stock ?? zeroAddress, pool: start.pool ?? zeroAddress, usdcInPool: start.usdcInPool ?? 0n, stockInPool: start.stockInPool ?? 0n }
  const usdc = address(9)

  const chain = {
    faucet: address(10),
    usdc,
    poolFactory: address(11),
    salts: {} as Record<string, Hex>,
    testnet: {
      readContract: async ({ functionName, address: on }: { functionName: string; address: Address }) => {
        if (functionName === "stockBySymbol") return state.stock
        if (functionName === "copyOf") return state.pool
        return on === usdc ? state.usdcInPool : state.stockInPool
      },
      waitForTransactionReceipt: async () => ({ status: "success" }),
    },
    wallet: {
      account: { address: address(12) },
      chain: undefined,
      writeContract: async ({ functionName, args }: { functionName: string; args: readonly unknown[] }) => {
        sent.push({ functionName, args })
        if (functionName === "createStock" || functionName === "createStockAt") state.stock = STOCK
        if (functionName === "createPool") state.pool = POOL
        return "0xhash"
      },
    },
  } as unknown as Chain
  return { chain, sent }
}

describe("build", () => {
  it("makes the stock, the pool in the mainnet pool's order, and fills the reserves", async () => {
    const { chain, sent } = fakeChain()
    const built = await build(chain, plan)

    expect(built).toEqual({ stock: STOCK, pool: POOL })
    expect(sent.map(({ functionName }) => functionName)).toEqual(["createStock", "createPool", "mint", "ownerMint"])
    // The stock is not token0 on this pool, so USDC comes first
    expect(sent[1]?.args).toEqual([plan.mainnetPool, address(9), STOCK, 100, 5])
    expect(sent[2]?.args).toEqual([POOL, 500n])
    expect(sent[3]?.args).toEqual([STOCK, POOL, 700n])
  })

  it("uses the vanity salt when there is one for the symbol", async () => {
    const { chain, sent } = fakeChain()
    chain.salts["tNVDAc"] = `0x${"ab".repeat(32)}`
    await build(chain, plan)
    expect(sent[0]).toEqual({ functionName: "createStockAt", args: ["Test NVDAc", "tNVDAc", `0x${"ab".repeat(32)}`] })
  })

  it("changes nothing when everything is already there", async () => {
    const { chain, sent } = fakeChain({ stock: STOCK, pool: POOL, usdcInPool: 500n, stockInPool: 900n })
    await build(chain, plan)
    expect(sent).toEqual([])
  })

  it("only adds what is missing from the reserves", async () => {
    const { chain, sent } = fakeChain({ stock: STOCK, pool: POOL, usdcInPool: 200n, stockInPool: 700n })
    await build(chain, plan)
    expect(sent).toEqual([{ functionName: "mint", args: [POOL, 300n] }])
  })
})
