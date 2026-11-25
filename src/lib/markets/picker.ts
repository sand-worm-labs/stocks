import type { Stock, StockCategory } from "@/types/markets"
import { summarizeCategory } from "./category"

type PickerGroup = { category: StockCategory; buyable: Stock[]; liquidity: number; shown: Stock[] }

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

export const pickedWith = (symbol: string, categories: StockCategory[], pickedIds: Set<string>) =>
  categories.find(({ id, symbols }) => pickedIds.has(id) && symbols.includes(symbol))
