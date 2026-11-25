// The SDK is resolved through its `exports` map, which this lint rule can't read; tsc resolves it
// eslint-disable-next-line import/no-unresolved
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"

import { researchResultSchema } from "@/lib/research/result"
import { StrategyError, type StrategyService } from "@/lib/strategies/service"
import type { StrategyRecord } from "@/types/store"

// What an agent from outside is shown of a strategy: what it asked for and the rules it was turned into. Nothing about money or wallets.
const brief = ({ id, name, brief, budget, assumption, summary, rules, strategy, stage }: StrategyRecord) => ({
  id,
  name,
  stage,
  brief,
  budget,
  assumption,
  summary,
  rules,
  strategy,
})

const answer = (value: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] })

// A refusal the agent can read and act on, in place of a failed call
const refusal = (error: unknown) => {
  if (error instanceof StrategyError) return { isError: true, content: [{ type: "text" as const, text: error.message }] }
  console.error(error)
  return { isError: true, content: [{ type: "text" as const, text: "Something went wrong on our side" }] }
}

// The tools an agent has on Sandworm Stocks, for one person's strategies. It can read what is waiting for research and hand back the
// result, and that is all: it cannot trade, move money or change a strategy's rules. More of what an agent may do (watching a live strategy,
// proposing an order for the person to sign) is added here as its own tool, each checking the same owner and the same steps as the app.
export function createStocksMcpServer(service: StrategyService, ownerId: string) {
  const server = new McpServer({ name: "sandworm-stocks", version: "0.1.0" })

  server.registerTool(
    "list_research_requests",
    {
      description:
        "Strategies whose rules the person has confirmed and that are waiting for research. Each is something to research on Sandworm: build the notebooks there, then call submit_research.",
    },
    async () => {
      try {
        return answer((await service.waitingForResearch(ownerId)).map(brief))
      } catch (error) {
        return refusal(error)
      }
    }
  )

  server.registerTool(
    "get_strategy",
    {
      description: "One strategy: the person's idea, the rules it was turned into, and the stocks it would hold.",
      inputSchema: { strategyId: z.string() },
    },
    async ({ strategyId }) => {
      try {
        return answer(brief(await service.owned(ownerId, strategyId)))
      } catch (error) {
        return refusal(error)
      }
    }
  )

  server.registerTool(
    "submit_research",
    {
      description: [
        "Hand back the research for a strategy that is waiting for it. Only works once per strategy, and only while it is waiting.",
        "Build the work as Sandworm notebooks first (the Sandworm tools: create_notebook, add_cell, run_notebook), one notebook per result the person should be able to open, such as performance, risk and holdings. Then pass what they show here.",
        "Keep it small: a one-line headline, a short summary, up to 8 metrics, one chart and up to 8 notes. The full analysis stays in the notebooks, and every notebook must be linked with its Sandworm url.",
        "Set isExample to true when the numbers are made up or from dummy data, so the person is told.",
      ].join(" "),
      inputSchema: { strategyId: z.string(), result: researchResultSchema },
    },
    async ({ strategyId, result }) => {
      try {
        const { stage } = await service.completeResearch(ownerId, strategyId, result)
        return answer({ ok: true, stage })
      } catch (error) {
        return refusal(error)
      }
    }
  )

  return server
}
