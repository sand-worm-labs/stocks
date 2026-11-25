import { describe, expect, it } from "vitest"

import { byLiquidity } from "@/lib/markets/filter"
import type { Stock } from "@/types/markets"

const stock = (symbol: string, liquidity?: number): Stock => ({ symbol, name: symbol, liquidity })

describe("market ordering", () => {
  it("puts the deepest first, and a stock with no pool last", () => {
    const stocks = [stock("SYM"), stock("AAPLc", 300), stock("NVDAc", 600)]

    expect([...stocks].sort(byLiquidity).map(({ symbol }) => symbol)).toEqual(["NVDAc", "AAPLc", "SYM"])
  })
})
