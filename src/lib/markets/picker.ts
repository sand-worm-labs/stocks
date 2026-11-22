import { summarizeCategory } from "./category"
import type { Stock, StockCategory } from "./types"

export type PickerGroup = { category: StockCategory; buyable: Stock[]; liquidity: number; shown: Stock[] }

// What the picker shows for what was typed. A category is shown when its name or any of its stocks match, and a stock
// when its symbol or name does, or when its category's name does.
export function filterPicker(query: string, stocks: Stock[], categories: StockCategory[]) {
  const needle = query.trim().toLowerCase()
  const matches = ({ symbol, name }: Stock) => `${symbol} ${name}`.toLowerCase().includes(needle)

  const groups: PickerGroup[] = categories.map((category) => {
    const { buyable, liquidity } = summarizeCategory(category, stocks)
    const isNamed = !!needle && category.label.toLowerCase().includes(needle)
    return { category, buyable, liquidity, shown: !needle || isNamed ? buyable : buyable.filter(matches) }
  })

  const isShown = ({ category, shown }: PickerGroup) =>
    !needle || shown.length > 0 || category.label.toLowerCase().includes(needle)

  return {
    categories: groups.filter(isShown),
    stockGroups: groups.filter(({ shown }) => shown.length > 0),
    isEmpty: !groups.some(isShown),
  }
}

// The categories that hold a stock, among those picked
export const pickedWith = (symbol: string, categories: StockCategory[], pickedIds: Set<string>) =>
  categories.find(({ id, symbols }) => pickedIds.has(id) && symbols.includes(symbol))
