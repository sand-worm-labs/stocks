import type { Knowledge, Stock, StockDetail } from "@/types/markets"

import { endAt, makeSeries } from "./series"

const SOURCES = [
  { name: "o1", url: "https://launch.o1.exchange/stocks", title: "o1 Launchpad · stocks on Base" },
  { name: "base.org", url: "https://www.base.org/stocks", title: "Base · tokenized stocks" },
]

const KNOWLEDGE: Record<string, Pick<StockDetail, "knowledge" | "risk">> = {
  NVDAc: {
    knowledge: [
      {
        id: "robotics-revenue",
        kind: "fact",
        text: "Automotive & robotics was $604M of $68.1B revenue in Q4 FY26.",
        source: {
          name: "verdict.co.uk",
          url: "https://www.verdict.co.uk/nvidia-q4-fy26-results/",
          title: "NVIDIA Q4 FY26 results",
        },
      },
      {
        id: "ai-chip-business",
        kind: "opinion",
        text: "Mostly an AI-chip business; robotics is a small, early bet.",
      } satisfies Knowledge,
    ],
    risk: { beta: 1.8, worstDrop: -0.37 },
  },
}

export function stockDetailMock({ symbol, price = 100 }: Stock): StockDetail {
  const seed = Array.from(symbol).reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const share = makeSeries(seed, 0.15, 120)
  const token = share.map((value, i) => value * (1 + 0.004 * Math.sin(i / 3)))
  const scale = price / (token.at(-1) ?? 1)

  return {
    issuer: "Coinbase · B20",
    ownership: "Price exposure, no votes",
    tradingHours: "24/7 · shares Mon–Fri",
    sources: SOURCES,
    tokenSeries: endAt(token, price),
    shareSeries: share.map((value) => Number((value * scale).toFixed(2))),
    knowledge: [],
    ...KNOWLEDGE[symbol],
  }
}
