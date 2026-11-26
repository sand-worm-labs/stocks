import type { NotebookCell } from "@/infrastructure/sandworm/sandworm.client"
import { REPORT_SECTIONS, type SectionId, sectionTitle } from "@/features/research/report-outline"

// What a notebook says when it is done: one line of JSON after this marker, printed by a python cell. It is how a notebook hands its
// numbers back to Stocks, so nothing has to be read out of a chart. Whatever builds notebooks for Stocks, this template today and
// Sandworm's own agent later, ends each one with such a line. The notebooks work out the numbers; Stocks only writes the sentences.
export const RESULT_MARKER = "STOCKS_RESULT "

// The cells of a notebook, and where each part of the report starts in them: the position of the cell that heads it, so that once the cells are
// added, the block of each part is known
export type NotebookPlan = { title: string; cells: NotebookCell[]; sections: Partial<Record<SectionId, number>> }

// What the notebook says about the strategy beyond the prices: the person's words, the rules, what was left out, and what each pool can take
export type NotebookContext = {
  idea?: string
  rules?: string[]
  // What the person should know before reading it, such as what they asked for that isn't on Base
  notes?: string[]
  maxShare?: number
  stocks?: { symbol: string; name?: string; liquidity: number; impact: number }[]
}

// What the notebooks are given: what the strategy holds, what it costs to trade, and the real prices to test it on
export type ResearchInputs = {
  name: string
  // The share of the money in each stock; what is left is cash
  weights: Record<string, number>
  // The fraction of the portfolio's high it may fall to before everything is sold, and the trading days it then waits
  stop: number | null
  pause: number
  // Paid on everything bought or sold: the swap fee and an allowance for slippage
  cost: number
  dates: string[]
  closes: Record<string, number[]>
  benchmark: string
}


const about = `Made by Sandworm Stocks for this strategy, on real daily prices of the shares each token follows. The test holds the plan's weights, looks at them again every 21 trading days, pays the cost on each trade, and sells everything if the portfolio falls to its stop. It does not model a token drifting from its share, or a pool's depth. Past results don't predict future ones.`

// The test itself, in plain python so anyone can read it and nothing has to be installed. It reads `DATA` from the cell before it and leaves its
// working in variables that every cell after it uses, so the working is written once and the parts that follow only read from it.
const THE_TEST = `
import json, math

D = DATA
dates, closes, w = D["dates"], D["closes"], D["weights"]
syms = list(w)
n = len(dates)
EVERY = 21

def pct(x, signed=True):
    return f"{x * 100:+.1f}%" if signed else f"{x * 100:.1f}%"

def daily(series):
    return [series[i] / series[i - 1] - 1 for i in range(1, len(series))]

def mean(xs):
    return sum(xs) / len(xs)

def cov(a, b):
    ma, mb = mean(a), mean(b)
    return sum((x - ma) * (y - mb) for x, y in zip(a, b)) / (len(a) - 1)

def simulate():
    held = {s: 0.0 for s in syms}
    cash, high, paused, stops = 1.0, 1.0, 0, 0
    out = [1.0]
    def trade(value):
        nonlocal cash
        moved = 0.0
        for s in syms:
            target = value * w[s]
            moved += abs(target - held[s])
            held[s] = target
        value -= moved * D["cost"]
        for s in syms:
            held[s] = value * w[s]
        cash = value - sum(held.values())
        return value
    value = trade(1.0)
    high = value
    for t in range(1, n):
        for s in syms:
            held[s] *= closes[s][t] / closes[s][t - 1]
        value = cash + sum(held.values())
        if paused:
            paused -= 1
            if paused == 0:
                value = trade(value)
                high = value
        else:
            high = max(high, value)
            if D["stop"] and value < high * (1 - D["stop"]):
                sold = sum(held.values())
                value -= sold * D["cost"]
                held = {s: 0.0 for s in syms}
                cash = value
                paused, stops = D["pause"], stops + 1
            elif t % EVERY == 0:
                value = trade(value)
        out.append(value)
    return out, stops

values, stops = simulate()
bench = [x / closes[D["benchmark"]][0] for x in closes[D["benchmark"]]]
years = (n - 1) / 252

def cagr(series):
    return (series[-1] / series[0]) ** (1 / years) - 1

def drawdowns(series):
    peak, out = series[0], []
    for x in series:
        peak = max(peak, x)
        out.append(x / peak - 1)
    return out

def every_week(series):
    idx = list(range(0, n, 5))
    if idx[-1] != n - 1:
        idx.append(n - 1)
    return idx

r_p, r_b = daily(values), daily(bench)
idx = every_week(values)
dd_p, dd_b = drawdowns(values), drawdowns(bench)
drop_p, drop_b = [x * 100 for x in dd_p], [x * 100 for x in dd_b]
print(f"Tested {n} trading days ({dates[0]} to {dates[-1]}) on {len(syms)} stocks. Each 1.00 put in ended at {values[-1]:.2f}; in the S&P 500 it ended at {bench[-1]:.2f}.")
`

// Each printed STOCKS_RESULT line stays well under the 4,000 characters Sandworm keeps of a cell's output, so a result is never cut off
// mid-way: the numbers are one line, and each chart's series is another, printed by the cell that draws it. The words above them are for the
// person reading the notebook; Stocks reads only the lines.
const THE_ANSWER = `
beta = cov(r_p, r_b) / cov(r_b, r_b)
vol = math.sqrt(cov(r_p, r_p) * 252)
alpha = (mean(r_p) - beta * mean(r_b)) * 252
sharpe = mean(r_p) * 252 / vol if vol else 0.0
last = min(252, n - 1)
month_end = {}
for i, d in enumerate(dates):
    month_end[d[:7]] = i
months = sorted(month_end)
monthly_r = [values[month_end[months[k]]] / values[month_end[months[k - 1]]] - 1 for k in range(1, len(months))]
positive = sum(1 for x in monthly_r if x > 0) / len(monthly_r) if monthly_r else 0.0
rolling = sorted(values[t] / values[t - 252] - 1 for t in range(252, n))

def pick(xs, share):
    return round(xs[min(len(xs) - 1, int(share * len(xs)))], 4)

year = {"bad": pick(rolling, 0.05), "typical": pick(rolling, 0.5), "good": pick(rolling, 0.95)} if rolling else None
bt = {
    "kind": "backtest",
    "years": round(years, 1),
    "from": dates[0],
    "to": dates[-1],
    "cagr": round(cagr(values), 4),
    "benchCagr": round(cagr(bench), 4),
    "sharpe": round(sharpe, 2),
    "beta": round(beta, 2),
    "alpha": round(alpha, 4),
    "recent": {"strategy": round(values[-1] / values[-1 - last] - 1, 4), "bench": round(bench[-1] / bench[-1 - last] - 1, 4)},
    "stops": stops,
    "volatility": round(vol, 4),
    "positiveMonths": round(positive, 3),
    "year": year,
}
edge = bt["cagr"] - bt["benchCagr"]
print(f"Over {bt['years']} years it grew {pct(bt['cagr'])} a year; the S&P 500 grew {pct(bt['benchCagr'])} a year.")
print(f"That is {'ahead of' if edge >= 0 else 'behind'} the market by {pct(abs(edge), False)} a year, after trading costs.")
print("${RESULT_MARKER}" + json.dumps(bt))
`

const KEY_NUMBERS = `
rows = [
    ("Return a year", pct(bt["cagr"]), "S&P 500 " + pct(bt["benchCagr"])),
    ("Worst fall from a peak", pct(min(dd_p)), "S&P 500 " + pct(min(dd_b))),
    ("Edge over the market a year", pct(bt["cagr"] - bt["benchCagr"]), "what it earned beyond just holding the market"),
    ("Sharpe ratio", f"{bt['sharpe']:.2f}", "return for each unit of ups and downs; higher is better"),
    ("Beta", f"{bt['beta']:.2f}", "1.00 moves with the market; below 1 moves less"),
    ("Months that were up", pct(bt["positiveMonths"], False), ""),
    ("Ups and downs a year", pct(bt["volatility"], False), "volatility"),
]
if bt["year"]:
    rows.append(("A bad / typical / good year", f"{pct(bt['year']['bad'])} / {pct(bt['year']['typical'])} / {pct(bt['year']['good'])}", "the 5th, 50th and 95th of every 12-month stretch"))
rows.append(("The last 12 months", pct(bt["recent"]["strategy"]), "S&P 500 " + pct(bt["recent"]["bench"])))
for label, value, note in rows:
    print(f"{label:<30}{value:<28}{note}")
`

const MONTHS_AND_RISK = `
monthly = [(m, values[month_end[m]] / values[month_end[months[k - 1]]] - 1) for k, m in enumerate(months) if k > 0]
worst = min(monthly, key=lambda x: x[1])
r_s = {s: daily(closes[s]) for s in syms}
r_hold = [sum(w[s] * r_s[s][t] for s in syms) for t in range(n - 1)]
var_hold = cov(r_hold, r_hold)
contribution = {s: w[s] * cov(r_s[s], r_hold) / var_hold for s in syms}
rk = {
    "kind": "risk",
    "maxDrawdown": round(min(dd_p), 4),
    "benchMaxDrawdown": round(min(dd_b), 4),
    "worstMonth": {"label": worst[0], "value": round(worst[1], 4)},
    "stops": stops,
    "risk": [{"symbol": s, "weight": round(w[s], 4), "riskShare": round(contribution[s], 4)} for s in syms],
    "alone": [{"symbol": s, "cagr": round((closes[s][-1] / closes[s][0]) ** (1 / years) - 1, 4), "maxDrawdown": round(min(drawdowns(closes[s])), 4)} for s in syms],
}
print(f"The worst month was {worst[0]}: {pct(worst[1])}.")
print("Where the ups and downs came from (money is how much is in it; risk is its share of the ups and downs):")
for s in syms:
    print(f"  {s:<10} money {w[s] * 100:5.1f}%   risk {contribution[s] * 100:5.1f}%")
print("${RESULT_MARKER}" + json.dumps(rk))
`

// Draws one chart of two lines and prints their series as one more line, as positions in the price dates so no date is said twice
const CHART = (title: string, kind: string, strategy: string, benchmark: string, digits: number) => `
import plotly.graph_objects as go
from sandworm_theme import chart

fig = go.Figure()
fig.add_trace(go.Scatter(x=[dates[i] for i in idx], y=[${strategy}[i] for i in idx], name="This strategy"))
fig.add_trace(go.Scatter(x=[dates[i] for i in idx], y=[${benchmark}[i] for i in idx], name="S&P 500"))
chart(fig, title="${title}", source="Source: Yahoo Finance daily closes, the test above")
print("${RESULT_MARKER}" + json.dumps({"kind": "${kind}", "idx": idx, "strategy": [round(${strategy}[i], ${digits}) for i in idx], "bench": [round(${benchmark}[i], ${digits}) for i in idx]}, separators=(",", ":")))
`

const python = (title: string, content: string): NotebookCell => ({ type: "python", title, content })
const markdown = (title: string, content: string): NotebookCell => ({ type: "markdown", title, content })

const stopOf = (inputs: ResearchInputs) => (inputs.stop === null ? "None" : String(inputs.stop))

// The cell that checks the result against what the person asked for, in the plain words the report uses
const limitsCell = (inputs: ResearchInputs, maxShare?: number) =>
  python(
    "Against your limits",
    `STOP, MAX_SHARE = ${stopOf(inputs)}, ${maxShare ?? "None"}
if STOP:
    print(f"Your loss limit is {STOP * 100:.0f}% below the portfolio's high. The worst fall in the test was {pct(min(dd_p))}, and the stop sold everything {stops} time(s).")
else:
    print(f"No loss limit was set. The worst fall in the test was {pct(min(dd_p))}.")
biggest = max(w, key=w.get)
if MAX_SHARE:
    print(f"Your cap is {MAX_SHARE * 100:.0f}% in one stock. The biggest holding is {biggest} at {w[biggest] * 100:.1f}% of the money.")
else:
    print(f"The biggest holding is {biggest} at {w[biggest] * 100:.1f}% of the money.")`
  )

const poolsCell = (stocks: NonNullable<NotebookContext["stocks"]>) =>
  python(
    "Pools and price impact",
    `POOLS = json.loads(r'''${JSON.stringify(stocks)}''')
print(f"{'Stock':<10}{'Pool size (USD)':>18}{'This order, as a share of the pool':>38}")
for p in POOLS:
    print(f"{p['symbol']:<10}{p['liquidity']:>18,.0f}{p['impact'] * 100:>37.2f}%")`
  )

const ownCell = python(
  "Each stock on its own",
  `print(f"{'Stock':<10}{'Money in it':>14}{'Its own return a year':>24}{'Its own worst fall':>22}")
for a in rk["alone"]:
    print(f"{a['symbol']:<10}{w[a['symbol']] * 100:>13.1f}%{pct(a['cagr']):>24}{pct(a['maxDrawdown']):>22}")`
)

// The real daily closes of the shares each token follows (Yahoo Finance), the S&P 500 as SPY, and the plan's weights, as the first cell of a
// notebook that tests the plan. Everything after it reads `DATA`.
export function pricesCell(inputs: ResearchInputs): NotebookCell {
  const data = JSON.stringify({
    dates: inputs.dates,
    closes: inputs.closes,
    weights: inputs.weights,
    stop: inputs.stop,
    pause: inputs.pause,
    cost: inputs.cost,
    benchmark: inputs.benchmark,
  })
  return {
    type: "python",
    title: "Prices and plan",
    content: `# Real daily closes of the shares each token follows (Yahoo Finance), the S&P 500 as SPY, and the plan's weights\nimport json\nDATA = json.loads(r'''${data}''')\nprint(len(DATA["dates"]), "days,", len(DATA["closes"]), "price series, from", DATA["dates"][0], "to", DATA["dates"][-1])`,
  }
}

const percent = (fraction: number) => `${Math.round(fraction * 100)}%`

// The cell a person starts at: what this is, what was asked, what is tested, and the parts that follow, which are the parts of the report
function startHere(inputs: ResearchInputs, context: NotebookContext) {
  const held = Object.entries(inputs.weights)
    .map(([symbol, weight]) => `${symbol} ${percent(weight)}`)
    .join(", ")
  const parts = REPORT_SECTIONS.map(({ id, title, reads }) => `- **${sectionTitle(id)}**: ${reads || title}`).join("\n")
  const notes = (context.notes ?? []).map((note) => `> ${note}`).join("\n")

  return [
    `# ${inputs.name}`,
    "This notebook is the working behind the Sandworm Stocks report for this strategy. Every number in the report is printed here, and you can run the notebook again to check it.",
    context.idea ? `**Your idea:** “${context.idea}”` : "",
    context.rules?.length ? `**Your rules:**\n${context.rules.map((rule) => `- ${rule}`).join("\n")}` : "",
    `**What is tested:** ${held}. What is left over is cash.`,
    notes,
    `## What is in it\nThe numbered parts match the numbered parts of the report, in the same order. Each has a heading, then a cell that prints its numbers.\n${parts}`,
    "**To read it:** run the cells from the top. The lines that start with `STOCKS_RESULT` are what the report is made from; the words printed above them are for you.",
  ]
    .filter(Boolean)
    .join("\n\n")
}

// The notebook of one strategy's research: one notebook, laid out as the report is, so the report reads as a summary of it and each part of the
// report has its block here. Every part is given the same real prices and holds the same test, so a number in one can be checked in another.
export function researchNotebook(inputs: ResearchInputs, context: NotebookContext = {}): NotebookPlan {
  const cells: NotebookCell[] = [
    markdown("Start here", startHere(inputs, context)),
    pricesCell(inputs),
    python("The test", THE_TEST),
  ]
  const sections: NotebookPlan["sections"] = {}
  // Each part starts with its heading, which is the block a link from the report goes to
  const part = (id: SectionId, ...body: NotebookCell[]) => {
    sections[id] = cells.length
    const { reads } = REPORT_SECTIONS.find((section) => section.id === id) ?? { reads: "" }
    cells.push(markdown(sectionTitle(id), `## ${sectionTitle(id)}\n${reads}`), ...body)
  }

  part("answer", python("The answer", THE_ANSWER))
  part("numbers", python("Key numbers", KEY_NUMBERS))
  part("growth", python("Growth of 1 USDC", CHART("Growth of 1 USDC: this strategy vs the S&P 500", "growth", "values", "bench", 3)))
  part("checks", limitsCell(inputs, context.maxShare))
  part("drawdown", python("Drop from the high", CHART("Drop from the highest value, % (strategy vs S&P 500)", "drawdown", "drop_p", "drop_b", 2)))
  part("risk", python("Worst month and risk", MONTHS_AND_RISK))
  part("buyable", ...(context.stocks?.length ? [poolsCell(context.stocks)] : [markdown("Pools", "How deep each pool is was not available for this run.")]))
  part("stocks", ownCell)
  part("sources", markdown("How the test works", `${about}\n\n**Prices:** daily closes from Yahoo Finance, from ${inputs.dates[0]} to ${inputs.dates.at(-1)}; the S&P 500 is ${inputs.benchmark}.\n\n**What it can't tell you:** nothing here says what will happen next.`))

  return { title: `${inputs.name} · Research`, cells, sections }
}
