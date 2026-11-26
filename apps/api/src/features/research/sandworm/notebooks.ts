import type { NotebookCell } from "@/infrastructure/sandworm/sandworm.client"

// What a notebook says when it is done: one line of JSON after this marker, printed by a python cell. It is how a notebook hands its
// numbers back to Stocks, so nothing has to be read out of a chart. Whatever builds notebooks for Stocks, this template today and
// Sandworm's own agent later, ends each one with such a line. The notebooks work out the numbers; Stocks only writes the sentences.
export const RESULT_MARKER = "STOCKS_RESULT "

export type NotebookPlan = { title: string; cells: NotebookCell[] }

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

const about = (what: string) =>
  `**${what}** Made by Sandworm Stocks for this strategy, on real daily prices of the shares each token follows. It holds the plan's weights, looks again every 21 trading days, pays the cost on each trade, and sells everything if the portfolio falls to its stop. It does not model a token drifting from its share, or a pool's depth. Past results don't predict future ones.`

// The test itself, in plain python so anyone can read it and nothing has to be installed. It reads `DATA` and leaves its working in
// variables the cells after it use.
const ENGINE = `
import json, math

D = DATA
dates, closes, w = D["dates"], D["closes"], D["weights"]
syms = list(w)
n = len(dates)
EVERY = 21

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
`

// Each printed line stays well under the 4,000 characters Sandworm keeps of a cell's output, so a result is never cut off mid-way: the
// numbers are one line, and each chart's series is another, printed by the cell that draws it.
const BACKTEST = `
beta = cov(r_p, r_b) / cov(r_b, r_b)
vol = math.sqrt(cov(r_p, r_p) * 252)
alpha = (mean(r_p) - beta * mean(r_b)) * 252
sharpe = mean(r_p) * 252 / vol if vol else 0.0
last = min(252, n - 1)
idx = every_week(values)
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
result = {
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
print("${RESULT_MARKER}" + json.dumps(result))
`

const RISK = `
dd_p, dd_b = drawdowns(values), drawdowns(bench)
drop_p, drop_b = [x * 100 for x in dd_p], [x * 100 for x in dd_b]
month_end = {}
for i, d in enumerate(dates):
    month_end[d[:7]] = i
months = sorted(month_end)
monthly = [(m, values[month_end[m]] / values[month_end[months[k - 1]]] - 1) for k, m in enumerate(months) if k > 0]
worst = min(monthly, key=lambda x: x[1])
r_s = {s: daily(closes[s]) for s in syms}
r_hold = [sum(w[s] * r_s[s][t] for s in syms) for t in range(n - 1)]
var_hold = cov(r_hold, r_hold)
contribution = {s: w[s] * cov(r_s[s], r_hold) / var_hold for s in syms}
idx = every_week(values)
result = {
    "kind": "risk",
    "maxDrawdown": round(min(dd_p), 4),
    "benchMaxDrawdown": round(min(dd_b), 4),
    "worstMonth": {"label": worst[0], "value": round(worst[1], 4)},
    "stops": stops,
    "risk": [{"symbol": s, "weight": round(w[s], 4), "riskShare": round(contribution[s], 4)} for s in syms],
    "alone": [{"symbol": s, "cagr": round((closes[s][-1] / closes[s][0]) ** (1 / years) - 1, 4), "maxDrawdown": round(min(drawdowns(closes[s])), 4)} for s in syms],
}
print("${RESULT_MARKER}" + json.dumps(result))
`

// Draws one chart of two lines and prints their series as one more line, as positions in the price dates so no date is said twice
const CHART = (title: string, kind: string, strategy: string, benchmark: string, digits: number) => `
import plotly.graph_objects as go
from sandworm_theme import chart

fig = go.Figure()
fig.add_trace(go.Scatter(x=[dates[i] for i in idx], y=[${strategy}[i] for i in idx], name="This strategy"))
fig.add_trace(go.Scatter(x=[dates[i] for i in idx], y=[${benchmark}[i] for i in idx], name="S&P 500"))
chart(fig, title="${title}", source="Source: Yahoo Finance daily closes, backtest above")
print("${RESULT_MARKER}" + json.dumps({"kind": "${kind}", "idx": idx, "strategy": [round(${strategy}[i], ${digits}) for i in idx], "bench": [round(${benchmark}[i], ${digits}) for i in idx]}, separators=(",", ":")))
`

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

// The notebook of one strategy's research: its summary first, then a backtest, and a look at its risk. Both parts are given the same real
// prices and hold the same test, so a number in one can be checked in the other, and the whole is something a person can open, read and run
// again.
export function researchNotebook(inputs: ResearchInputs): NotebookPlan {
  const prices = pricesCell(inputs)
  const summary = `# ${inputs.name}\n${about("Research.")}\n\nTwo parts follow: **Backtest**, how the plan would have done against the S&P 500, and **Risk**, how far it fell and where the risk sits.`
  const test = (title: string, body: string): NotebookCell => ({
    type: "python",
    title,
    content: `${ENGINE}${body}`,
  })

  return {
    title: `${inputs.name} · Research`,
    cells: [
      { type: "markdown", title: "Summary", content: summary },
      prices,
      { type: "markdown", title: "Backtest", content: "## Backtest\nHow this plan would have done on the real prices, against the S&P 500." },
      test("Backtest", BACKTEST),
      { type: "python", title: "Growth of 1 USDC", content: CHART("Growth of 1 USDC: this strategy vs the S&P 500", "growth", "values", "bench", 3) },
      { type: "markdown", title: "Risk", content: "## Risk\nHow far it fell, and which stocks the ups and downs came from." },
      test("Risk", RISK),
      { type: "python", title: "Drop from the high", content: CHART("Drop from the highest value, % (strategy vs S&P 500)", "drawdown", "drop_p", "drop_b", 2) },
    ],
  }
}
