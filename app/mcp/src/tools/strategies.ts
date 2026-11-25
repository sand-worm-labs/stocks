import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"

import { researchResultSchema } from "../research-result"
import { addTool, path } from "../tool"
import type { Web } from "../web"

const strategyId = z.string()

// What a person does with their strategies in the app, from making one to getting its research back and sharing the report. Each tool is one
// of the app's own API calls (the same ones its pages make), so what is allowed and what is refused is the same in both.
export function addStrategyTools(server: McpServer, web: Web) {
  addTool(server, "list_strategies", "Every strategy this person has made, newest first, with where each one is: its status and stage.", {}, () =>
    web.get("/api/strategies")
  )

  addTool(
    server,
    "create_strategy",
    "Make a strategy from an idea in plain words, such as 'big tech, no more than 25% in one stock'. It comes back with its id; read its rules with get_strategy, then lock them with confirm_rules.",
    { brief: z.string().min(1).max(2000) },
    (input) => web.post("/api/strategies", input)
  )

  addTool(server, "get_strategy", "One strategy: the person's idea, the rules it was turned into, the stocks it would hold, and how its report should come out.", { strategyId }, (input) =>
    web.get(`/api/strategies/${path(input.strategyId)}/brief`)
  )

  addTool(
    server,
    "get_report",
    "All of a strategy as its owner sees it: its stage, what the research found, what it holds, its cash, and what has happened to it.",
    { strategyId },
    (input) => web.get(`/api/strategies/${path(input.strategyId)}`)
  )

  addTool(server, "rename_strategy", "Give a strategy a new name.", { strategyId, name: z.string().min(1).max(200) }, ({ strategyId: id, name }) =>
    web.patch(`/api/strategies/${path(id)}`, { name })
  )

  addTool(
    server,
    "confirm_rules",
    "Lock a strategy's rules and start its research. After this the strategy waits for research: do it on Sandworm, then give the result back with submit_research.",
    { strategyId },
    (input) => web.post(`/api/strategies/${path(input.strategyId)}/confirm`)
  )

  addTool(
    server,
    "check_research",
    "Where a strategy's research has got to: its stage, any progress, and the error if it stopped.",
    { strategyId },
    (input) => web.post(`/api/strategies/${path(input.strategyId)}/ready`)
  )

  addTool(
    server,
    "retry_research",
    "Start research again for a strategy whose research stopped with an error.",
    { strategyId },
    (input) => web.post(`/api/strategies/${path(input.strategyId)}/retry`)
  )

  addTool(
    server,
    "list_research_requests",
    "Strategies whose rules the person has confirmed and that are waiting for research. Each is something to research on Sandworm: build one notebook there, then call submit_research.",
    {},
    () => web.get("/api/strategies/waiting")
  )

  addTool(
    server,
    "submit_research",
    [
      "Hand back the research for a strategy that is waiting for it. Only works once per strategy, and only while it is waiting.",
      "Build the work as one Sandworm notebook for this strategy first (the Sandworm tools: create_notebook, add_cell, run_notebook), with its summary in the first cell and then its parts, such as performance, risk and holdings. Then pass what it shows here.",
      "Keep it small: a one-line headline, a short summary, up to 8 metrics, a couple of charts and up to 8 notes. The full analysis stays in the notebook, and it must be linked with its Sandworm url.",
      "Set isExample to true when the numbers are made up or from dummy data, so the person is told.",
    ].join(" "),
    { strategyId, result: researchResultSchema },
    ({ strategyId: id, result }) => web.post(`/api/strategies/${path(id)}/research`, { result })
  )

  addTool(
    server,
    "share_report",
    "A link anyone can open to read a strategy's report, without signing in. Only for a strategy that has a report.",
    { strategyId },
    (input) => web.post(`/api/strategies/${path(input.strategyId)}/share`)
  )

  addTool(
    server,
    "get_activity",
    "What has happened to this person's strategies: research started and finished, trading started, money put in, stocks bought and sold. Newest first. Pass strategyId for one strategy.",
    { strategyId: strategyId.optional() },
    ({ strategyId: only }) => web.get(only ? `/api/strategies/${path(only)}/activity` : "/api/activity")
  )
}
