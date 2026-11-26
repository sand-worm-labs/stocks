import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"

import { researchResultSchema } from "../research-result"
import { addTool, path } from "../tool"
import type { Api } from "../api"

const strategyId = z.string()

// A rule as `get_rules` gives its setting. The app checks each one in full and says what is wrong with it, so this only says what to send.
const ruleSetting = z.object({
  type: z.enum(["budget", "max-weight", "min-liquidity", "approval", "stop-loss", "take-profit", "portfolio-stop", "condition"]),
  amount: z.number().optional(),
  limit: z.number().optional(),
  pause: z.number().optional(),
  mode: z.enum(["never", "only"]).optional(),
  condition: z.record(z.unknown()).optional(),
})

// What a person does with their strategies in the app, from making one to getting its research back and sharing the report. Each tool is one
// of the app's own API calls (the same ones its pages make), so what is allowed and what is refused is the same in both.
export function addStrategyTools(server: McpServer, api: Api) {
  addTool(server, "list_strategies", "Every strategy this person has made, newest first, with where each one is: its status (draft, live, closed) and stage. What they have deleted is not here: see list_trash.", {}, () =>
    api.get("/strategies")
  )

  addTool(
    server,
    "create_strategy",
    [
      "Make a strategy from an idea in plain words, such as 'big tech, no more than 25% in one stock'. It comes back with its id and `coverage`: how much of what the idea named can be bought on Base.",
      "Read `coverage` before anything else. basis 'fallback' means NOTHING the idea named is on Base, so the strategy would test the most liquid stocks instead; 'partly' means some of it isn't. Tell the person what couldn't be matched (`couldntMatch`) and what would be tested (`tests`), and let them choose: go ahead, or make a new strategy with a different idea. Never force the missing names into the rules.",
      "Then read the rules with get_strategy, and lock them with confirm_rules.",
    ].join(" "),
    { brief: z.string().min(1).max(2000) },
    (input) => api.post("/strategies", input)
  )

  addTool(server, "get_strategy", "One strategy: the person's idea, the rules it was turned into, the stocks it would hold, and how its report should come out. `coverage` says how much of what the idea named is on Base, what couldn't be matched, and what is actually tested.", { strategyId }, (input) =>
    api.get(`/strategies/${path(input.strategyId)}/brief`)
  )

  addTool(
    server,
    "get_rules",
    "A strategy's rules as the person sees them: each in plain words with the exact setting behind it, whether they are confirmed yet, and, once it is trading, how close each is to its limit. `coverage` says what of the person's idea isn't on Base and what is tested instead.",
    { strategyId },
    (input) => api.get(`/strategies/${path(input.strategyId)}/rules`)
  )

  addTool(
    server,
    "edit_rules",
    [
      "Replace the rules of a strategy that is still being looked over (before confirm_rules). Pass the whole list: start from get_rules, whose `setting` of each rule is what to send back, changed as needed.",
      "A rule is {type, ...}: budget {amount}, max-weight {limit: 0 to 1}, min-liquidity {amount}, approval, stop-loss {limit}, take-profit {limit}, portfolio-stop {limit, pause?}, condition {mode: never|only, condition}.",
      "A strategy has one each of budget, max-weight, min-liquidity, approval and portfolio-stop. Once rules are confirmed the research is done on them and they can't be changed.",
    ].join(" "),
    { strategyId, rules: z.array(ruleSetting).max(20) },
    ({ strategyId: id, rules }) => api.put(`/strategies/${path(id)}/rules`, { rules })
  )

  addTool(
    server,
    "get_report",
    "All of a strategy as its owner sees it: its stage, what the research found, what it holds, its cash, and what has happened to it.",
    { strategyId },
    (input) => api.get(`/strategies/${path(input.strategyId)}`)
  )

  addTool(server, "rename_strategy", "Give a strategy a new name. Allowed at any stage, even while it is trading; it changes only the name.", { strategyId, name: z.string().min(1).max(200) }, ({ strategyId: id, name }) =>
    api.patch(`/strategies/${path(id)}`, { name })
  )

  addTool(
    server,
    "confirm_rules",
    "Lock a strategy's rules and start its research. If `coverage.basis` is 'fallback' or 'partly', make sure the person has been told what isn't on Base and has said to go ahead with what is tested. After this the strategy waits for research: do it on Sandworm, then give the result back with submit_research.",
    { strategyId },
    (input) => api.post(`/strategies/${path(input.strategyId)}/confirm`)
  )

  addTool(
    server,
    "check_research",
    "Where a strategy's research has got to: its stage, any progress, and the error if it stopped.",
    { strategyId },
    (input) => api.post(`/strategies/${path(input.strategyId)}/ready`)
  )

  addTool(
    server,
    "retry_research",
    "Start research again for a strategy whose research stopped with an error.",
    { strategyId },
    (input) => api.post(`/strategies/${path(input.strategyId)}/retry`)
  )

  addTool(
    server,
    "list_research_requests",
    "Strategies whose rules the person has confirmed and that are waiting for research. Each is something to research on Sandworm: build one notebook there, then call submit_research. Each has `coverage`: research the stocks in `tests`, and say plainly in the result that what is in `couldntMatch` was not tested.",
    {},
    () => api.get("/strategies/waiting")
  )

  addTool(
    server,
    "submit_research",
    [
      "Hand back the research for a strategy that is waiting for it. Only works once per strategy, and only while it is waiting.",
      "Build the work as ONE Sandworm notebook for this strategy first (the Sandworm tools: create_notebook, add_cell, run_notebook), laid out as get_strategy's `report.outline` says: a 'Start here' cell, then each numbered part with a heading cell titled exactly as given. Never make a second notebook; add to the first. Then pass what it shows here.",
      "Pass `blocks` too: the id of each part's heading cell, by the part's id (answer, numbers, growth, checks, drawdown, risk, buyable, stocks, sources), so each part of the report links to its own place in the notebook. Every step's url must be the notebook's own.",
      "Keep it small: a one-line headline, a short summary, up to 8 metrics, a couple of charts and up to 8 notes. The full analysis stays in the notebook, and it must be linked with its Sandworm url.",
      "Set isExample to true when the numbers are made up or from dummy data, so the person is told.",
      "The headline and summary must only claim what was tested: if the strategy's `coverage.couldntMatch` is not empty, say in the summary that those weren't tested because they aren't on Base yet.",
    ].join(" "),
    { strategyId, result: researchResultSchema },
    ({ strategyId: id, result }) => api.post(`/strategies/${path(id)}/research`, { result })
  )

  addTool(
    server,
    "share_report",
    "A link anyone can open to read a strategy's report, without signing in. Only for a strategy that has a report.",
    { strategyId },
    (input) => api.post(`/strategies/${path(input.strategyId)}/share`)
  )

  addTool(
    server,
    "close_strategy",
    "End a strategy that is trading: everything it holds is sold at today's prices and the cash is taken out, so nothing is left in it. It is then closed: kept to read, and it can be deleted. Do this before delete_strategy for one that holds money. Ask the person first: it sells everything.",
    { strategyId },
    (input) => api.post(`/strategies/${path(input.strategyId)}/close`)
  )

  addTool(
    server,
    "delete_strategy",
    "Put a strategy in the trash, with its chat. It is kept for 30 days and can be put back with restore_strategy. A strategy that is still trading is refused: close_strategy first. The Sandworm notebook it was researched in stays in the person's Sandworm workspace.",
    { strategyId },
    (input) => api.delete(`/strategies/${path(input.strategyId)}`)
  )

  addTool(
    server,
    "restore_strategy",
    "Put a strategy back from the trash, exactly as it was.",
    { strategyId },
    (input) => api.post(`/strategies/${path(input.strategyId)}/restore`)
  )

  addTool(server, "list_trash", "The strategies this person has deleted, with the day each will be deleted for good.", {}, () => api.get("/strategies/trash"))

  addTool(
    server,
    "purge_strategy",
    "Delete a strategy that is in the trash FOR GOOD, with its chat, activity and ledger. It can't be undone. Only do it when the person has asked for exactly this; `confirmName` has to be the strategy's exact name.",
    { strategyId, confirmName: z.string().min(1).max(200) },
    ({ strategyId: id, confirmName }) => api.post(`/strategies/${path(id)}/purge`, { confirmName })
  )

  addTool(
    server,
    "get_activity",
    "What has happened to this person's strategies: research started and finished, trading started, money put in, stocks bought and sold. Newest first. Pass strategyId for one strategy.",
    { strategyId: strategyId.optional() },
    ({ strategyId: only }) => api.get(only ? `/strategies/${path(only)}/activity` : "/activity")
  )
}
