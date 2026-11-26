import { createSandwormChatProducer } from "@/features/research/sandworm/chat-producer"
import { createSandwormProducer } from "@/features/research/sandworm/template-producer"
import type { Producer } from "@/features/strategies/lifecycle/strategy-lifecycle"
import type { Stock } from "@/features/market/types/market.types"

import type { GetDailyPrices } from "./prices"
import { settings } from "@/config/settings"

type Sources = { market: () => Promise<Stock[]>; getPrices: GetDailyPrices }

// Who does the research, chosen by `RESEARCH_PRODUCER`:
//   "sandworm"  Sandworm's own chat does the research, as it does in a notebook there. The default whenever `SANDWORM_API_URL` is set.
//   "template"  A fixed backtest and risk notebook built and run on Sandworm, with no chat. The older way, kept as a fallback.
//   "agent"     an agent from outside (Claude) is waited on: it reads the request from the Stocks MCP, builds a notebook on Sandworm, and submits
//   "standin"   the stand-in: a timed run with a template report, for working on the app with nothing connected. The default without Sandworm.
export function getProducer({ market, getPrices }: Sources): Producer | undefined {
  const { researchProducer, sandworm } = settings()
  if (researchProducer === "agent") return { runner: "agent" }

  const baseUrl = sandworm.apiUrl
  if (researchProducer === "standin" || !baseUrl) return undefined
  const create = researchProducer === "sandworm" ? createSandwormChatProducer : createSandwormProducer
  return create({ baseUrl, market, getPrices })
}
