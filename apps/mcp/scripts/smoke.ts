// A scripted run of the Stocks MCP over the real protocol, the way an agent uses it, against the running app: every tool, in the order a person
// goes from an idea to trading, and what the app must refuse. It makes ONE strategy in the account the token is for, named "MCP smoke test".
//
//   pnpm smoke                      (MCP_URL defaults to http://localhost:4100/mcp; the token is STOCKS_AGENT_TOKEN or MCP_TOKEN)
//
// Each line says what was tried and what came back, so a gap shows as ✗ or as a note. It exits 1 if anything that should work doesn't.
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"

const URL_OF_MCP = process.env.MCP_URL ?? "http://localhost:4100/mcp"
const TOKEN = process.env.MCP_TOKEN ?? process.env.STOCKS_AGENT_TOKEN
if (!TOKEN) {
  console.error("Set MCP_TOKEN (or STOCKS_AGENT_TOKEN) to the test token that ./scripts/mcp-test.sh printed")
  process.exit(1)
}

const client = new Client({ name: "smoke", version: "0" })
await client.connect(new StreamableHTTPClientTransport(new URL(URL_OF_MCP), { requestInit: { headers: { Authorization: `Bearer ${TOKEN}` } } }))

type Answer = { isError: boolean; text: string; json?: any }
async function call(name: string, args: Record<string, unknown> = {}): Promise<Answer> {
  const result = await client.callTool({ name, arguments: args })
  const text = (result.content as { text: string }[])[0]?.text ?? ""
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    // a refusal is a plain sentence
  }
  return { isError: Boolean(result.isError), text, json }
}

let failures = 0
const say = (mark: string, line: string) => console.log(`${mark} ${line}`)
const short = (text: string) => text.replace(/\s+/g, " ").slice(0, 110)

// A step that should work
async function works(label: string, name: string, args: Record<string, unknown> = {}) {
  const answer = await call(name, args)
  if (answer.isError) {
    failures++
    say("✗", `${label}: ${name} was refused: ${short(answer.text)}`)
  } else say("✓", `${label}: ${name}`)
  return answer
}

// A step the app must refuse, and the words it says
async function refuses(label: string, name: string, args: Record<string, unknown>) {
  const answer = await call(name, args)
  if (!answer.isError) {
    failures++
    say("✗", `${label}: ${name} was NOT refused`)
  } else say("✓", `${label}: refused, "${short(answer.text)}"`)
}

const { tools } = await client.listTools()
say("•", `${tools.length} tools: ${tools.map(({ name }) => name).join(", ")}`)

console.log("\n— the markets")
await works("what is listed", "get_market_summary")
const listed = await works("buyable stocks", "list_stocks", { buyableOnly: true })
const first = (listed.json as { symbol: string }[] | undefined)?.[0]?.symbol
if (first) await works(`one stock (${first})`, "get_stock", { symbol: first })

console.log("\n— from an idea to rules")
await works("what exists already", "list_strategies")
const made = await works("make a strategy", "create_strategy", {
  brief: "MCP smoke test: grow 500 USDC with big tech over 3+ years. Max 25% in any one stock. Ask before buying.",
})
const id: string | undefined = made.json?.id
say("•", `coverage of what the idea named: ${made.json?.coverage?.basis ?? "(missing: create_strategy should say)"}`)
if (!made.json?.coverage) failures++
if (!id) {
  console.log("\nNo strategy was made, so nothing after this can be tried.")
  process.exit(1)
}
const brief = await works("read what it became", "get_strategy", { strategyId: id })
say("•", `its report is to lead with: ${JSON.stringify(brief.json?.report?.kpis ?? "(no kpis)").slice(0, 100)}`)
const rules = await works("read the rules", "get_rules", { strategyId: id })
const settings = (rules.json?.rules as { setting: unknown }[] | undefined)?.map(({ setting }) => setting) ?? []
await works("edit the rules (same ones back)", "edit_rules", { strategyId: id, rules: settings })
await works("rename", "rename_strategy", { strategyId: id, name: `MCP smoke test ${new Date().toISOString().slice(11, 16)}` })

// An idea about something that isn't on Base: the app must say so at once, not quietly test something else
const oil = await works("an idea about oil", "create_strategy", { brief: "MCP smoke test: grow 1,000 USDC in oil stocks (Exxon, Chevron, Shell). Ask before buying." })
const isSaid = oil.json?.coverage?.basis === "fallback" && /Nothing on Base matches/.test(oil.json?.coverage?.headline ?? "")
say(isSaid ? "✓" : "✗", `it says so: ${oil.json?.coverage?.headline ?? "(nothing said)"}`)
if (!isSaid) failures++

console.log("\n— research")
await refuses("trade before research", "start_trading", { strategyId: id, mode: "paper", amount: 100 })
await works("lock the rules", "confirm_rules", { strategyId: id })
await refuses("edit rules after they are locked", "edit_rules", { strategyId: id, rules: settings })
await refuses("lock them twice", "confirm_rules", { strategyId: id })

let stage = (await works("where is the research", "check_research", { strategyId: id })).json?.stage
const waiting = await works("what waits for an agent", "list_research_requests")
const isWaiting = (waiting.json as { id: string }[] | undefined)?.some((request) => request.id === id)
say("•", `stage after confirm: ${stage}; waiting for an agent: ${Boolean(isWaiting)}`)

if (stage === "researching" && isWaiting) {
  const result = {
    headline: "Example result from the smoke test",
    summary: "Made-up numbers, handed back by the smoke test to check that research can be submitted.",
    metrics: [{ label: "Return a year", value: "+10%" }],
    notebook: { title: "Smoke test notebook", url: "https://app.sandwormlab.xyz/notebooks/smoke-test" },
    isExample: true,
  }
  // A second notebook is refused: a strategy is researched in one
  const twoNotebooks = { ...result, steps: [{ label: "Backtest", url: result.notebook.url }, { label: "Risk", url: "https://app.sandwormlab.xyz/notebooks/another" }] }
  await refuses("research in two notebooks", "submit_research", { strategyId: id, result: twoNotebooks })
  const outline = brief.json?.report?.outline as { id: string; title: string }[] | undefined
  say(outline?.length === 9 ? "✓" : "✗", `the report's parts the notebook follows: ${outline?.map(({ title }) => title).join(" | ") ?? "(none told)"}`)
  if (outline?.length !== 9) failures++
  await works("hand back research, with a block for each part", "submit_research", { strategyId: id, result: { ...result, blocks: Object.fromEntries((outline ?? []).map(({ id: part }, i) => [part, `block-${i + 1}`])) } })
  await refuses("hand it back twice", "submit_research", { strategyId: id, result })
  stage = (await call("check_research", { strategyId: id })).json?.stage
} else if (stage === "researching") {
  say("•", "research is not waiting for an agent (the stand-in or Sandworm is doing it); asking again")
  stage = (await call("check_research", { strategyId: id })).json?.stage
}
say(stage === "ready" ? "✓" : "✗", `research ends ready (is: ${stage})`)
if (stage !== "ready") failures++

await works("the report", "get_report", { strategyId: id })
await works("share the report", "share_report", { strategyId: id })

console.log("\n— trading on paper")
await refuses("live trading without a wallet signature", "start_trading", { strategyId: id, mode: "live", amount: 100 })
await works("start on paper", "start_trading", { strategyId: id, mode: "paper", amount: 200 })
await refuses("start twice", "start_trading", { strategyId: id, mode: "paper", amount: 200 })
const live = await works("what it holds", "get_report", { strategyId: id })
say("•", `holds ${live.json?.holdings?.length ?? 0} stocks, cash ${live.json?.cash}`)
const standing = await works("where each rule stands", "get_rules", { strategyId: id })
say("•", `standing of rule 2: ${JSON.stringify(standing.json?.rules?.[1]?.standing ?? "(none)")}`)
await works("add funds", "change_funds", { strategyId: id, direction: "add", amount: 50 })
await refuses("take out more cash than there is", "change_funds", { strategyId: id, direction: "remove", amount: 99999 })
await works("sell half of everything", "sell", { strategyId: id, share: 0.5 })
await refuses("sell something not held", "sell", { strategyId: id, symbols: ["NOTHELD"], share: 1 })
await works("this strategy's activity", "get_activity", { strategyId: id })
await works("all activity", "get_activity")

console.log("\n— who may see it")
await refuses("another person's strategy", "get_report", { strategyId: "someone-elses-strategy-0000" })

console.log(`\n${failures ? `✗ ${failures} thing(s) did not work as they should` : "✓ everything worked as it should"}`)
await client.close()
process.exit(failures ? 1 : 0)
