import { getStocks } from "@/lib/markets/source"
import { createSandwormProducer } from "@/lib/sandworm/producer"
import type { Producer } from "@/lib/strategies/service"

// Who does the research, chosen by `RESEARCH_PRODUCER`:
//   "sandworm"  Stocks builds and runs notebooks on Sandworm as the person who is signed in. The default whenever `SANDWORM_API_URL` is set.
//   "agent"     an agent from outside (Claude) is waited on: it reads the request from the Stocks MCP, builds notebooks on Sandworm, and submits
//   "standin"   the stand-in: a timed run with a template report, for working on the app with nothing connected. The default without Sandworm.
// More producers are added here, each one a way of getting a ResearchResult.
export function getProducer(): Producer | undefined {
  const baseUrl = process.env.SANDWORM_API_URL
  const chosen = process.env.RESEARCH_PRODUCER || (baseUrl ? "sandworm" : "standin")
  if (chosen === "sandworm" && baseUrl) return createSandwormProducer({ baseUrl, market: getStocks })
  if (chosen === "agent") return {}
  return undefined
}
