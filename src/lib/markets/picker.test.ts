import { describe, expect, it } from "vitest"

import type { Stock, StockCategory } from "@/types/markets"
import { filterPicker, pickedWith } from "./picker"

const stocks: Stock[] = [
  { symbol: "NVDAc", name: "NVIDIA Corporation", price: 100, liquidity: 500 },
  { symbol: "TSLAc", name: "Tesla Inc.", price: 100, liquidity: 300 },
  { symbol: "SYM", name: "Symbotic" },
]
const categories: StockCategory[] = [
  { id: "robotics", label: "Robotics", symbols: ["NVDAc", "TSLAc", "SYM"] },
  { id: "chips", label: "AI chips", symbols: ["NVDAc"] },
]

const symbols = (groups: { shown: Stock[] }[]) => groups.flatMap(({ shown }) => shown.map(({ symbol }) => symbol))

describe("the picker's search", () => {
  it("shows everything for nothing typed", () => {
    const view = filterPicker("", stocks, categories)

    expect(view.categories).toHaveLength(2)
    expect(symbols(view.stockGroups)).toEqual(["NVDAc", "TSLAc", "NVDAc"])
    expect(view.isEmpty).toBe(false)
  })

  it("narrows to the stocks that match, and the categories that hold them", () => {
    const view = filterPicker("tesla", stocks, categories)

    expect(symbols(view.stockGroups)).toEqual(["TSLAc"])
    expect(view.categories.map(({ category }) => category.id)).toEqual(["robotics"])
  })

  it("shows every stock of a category that is named", () => {
    expect(symbols(filterPicker("chips", stocks, categories).stockGroups)).toEqual(["NVDAc"])
    expect(symbols(filterPicker("robotics", stocks, categories).stockGroups)).toEqual(["NVDAc", "TSLAc"])
  })

  it("says so when nothing matches", () => {
    expect(filterPicker("zzzz", stocks, categories).isEmpty).toBe(true)
  })

  it("does not offer a stock with no token", () => {
    expect(symbols(filterPicker("symbotic", stocks, categories).stockGroups)).toEqual([])
  })
})

describe("what a picked category brings in", () => {
  it("names the picked category that holds the stock", () => {
    expect(pickedWith("NVDAc", categories, new Set(["chips"]))?.label).toBe("AI chips")
    expect(pickedWith("TSLAc", categories, new Set(["chips"]))).toBeUndefined()
  })
})
