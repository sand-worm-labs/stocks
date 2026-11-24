# Steady leaders: how the strategy was designed

Written 2026-11-24. The strategy is `steadyLeadersStrategyMockData` in `src/_mockdata/strategies.ts`; its rules are in
`src/_mockdata/rules.ts` under `steady-leaders`.

## What it does

| Part | Setting |
| --- | --- |
| Universe | AAPL, GOOGL, NVDA, META, AMZN, TSLA, NFLX, LLY, TTWO (as the `c` tokens) |
| Pick | Every month, the 4 with the best 126-day return |
| Size | Inverse volatility over 60 days: the steadier a pick, the more of it |
| Rebalance | Trade a held pick back to its share only if it drifts more than 5 points, checked weekly |
| Exit (the strategy's own) | A stock that leaves the top 4 is sold at the next monthly look |
| Exit (rule) | One stop on the whole portfolio: sell everything if it falls 30% from its high, then stay in cash for 63 trading days (about 3 months) |
| Limits (rules) | Budget 5,000 USDC, max 50% in one stock, liquidity at least $100K, ask before buying |
| Left out | A switch to cash when the market is weak, a take-profit, and a stop-loss on each stock |

## Why those choices

Ideas came from three bodies of work, none read in full here (searches gave summaries, not the papers):
trend following with a long moving average (Faber, "A Quantitative Approach to Tactical Asset Allocation"), momentum and its
crashes (Daniel and Moskowitz, "Momentum Crashes", NBER 20439), and band rebalancing (Vanguard's rebalancing papers).
Each was then tested on the app's own engine over **10 years of real daily closes (Nov 2016 to Nov 2026)**, with the sample cut
at 2022-05-23 so each choice could be checked on both halves. The numbers below are full-sample CAGR / worst fall / Sharpe.

| Variant | CAGR | Worst fall | Sharpe | Orders |
| --- | --- | --- | --- | --- |
| Hold all 9 equally, band rebalance | 31.2% | -37.3% | 1.19 | 50 |
| S&P 500 (SPY) | 13.8% | -33.7% | 0.78 | 2 |
| Top 4 by 126-day return, monthly | 35.6% | -37.5% | 1.15 | 532 |
| Same, with a 5-point band | 37.4% | -37.8% | 1.18 | 239 |
| **Same, inverse-volatility weights (chosen)** | **34.9%** | **-29.5%** | **1.21** | **296** |
| Chosen, only while any of 4 leaders is above its 150-day average | 25.4% | -34.3% | 1.02 | 547 |
| Per-stock 200-day trend filter, equal weight | 20.5% | -24.0% | 1.09 | 2,442 |
| Top 4 with 25% stop-loss | 36.3% | -42.2% | 1.16 | 238 |
| Top 4 with 50% take-profit | 30.0% | -40.1% | 1.08 | 265 |

What held up in both halves: the band cut orders by more than half without costing return; inverse-volatility weights cut the
worst fall and raised the Sharpe; every market-wide gate to cash lowered the Sharpe; take-profit lowered it too.

## What to be careful about

- **Survivorship bias.** The universe is today's big winners (NVDA, META, TSLA, LLY...). Absolute returns are far higher than a
  fair test would give. Only the *differences between variants* are worth reading.
- **It did not beat holding the same 9 stocks equally on return.** It cut the worst fall (-29.5% against -37.3%) at about the same
  Sharpe (1.21 against 1.19). Fees were about $12,500 on a $10,000 start over the 10 years (0.3% a trade), which is why the
  band matters. It lagged in 2019, 2021 and 2023.
- **Exits are about the whole portfolio, not each stock.** A per-stock 30% stop fired once in 10 years and changed nothing. A stop on
  the whole portfolio at tighter levels made it worse in both halves, because it sold near the bottom and sat out the rebound:

  | Portfolio stop (3 months in cash) | CAGR | Worst fall | Sharpe |
  | --- | --- | --- | --- |
  | None | 34.9% | -29.5% | 1.21 |
  | 25% from its high | 24.7% | -33.3% | 0.97 |
  | 20% | 19.8% | -30.9% | 0.85 |
  | 15% | 7.9% | -35.9% | 0.46 |
  | 30% (chosen) | 34.9% | -29.5% | never fired |

  The 30% stop is set at the loss limit the strategy was given. It cost nothing here and only protects against a fall bigger than any in
  these 10 years. That is insurance, not a measured gain.
- **Max weight 50%.** Inverse volatility put more than 40% in one stock at 11% of monthly looks, and 50% at most.
- Nothing here is tuned on the last two halves separately; the settings are round numbers (126, 60, 4, 5%) to avoid fitting.
- The backtest and its stop-loss are **not yet connected to the Results page**, which still shows made-up report data.

## What was added to the engine

`backtest()` takes optional `stopLoss`, `takeProfit`, `cooldown`, `portfolioStop` and `pause` (default off, so nothing existing changes) and reports `exits`.
Stops act on what was paid, as the stop-loss rule does, and fire at that day's close.

## How exits are drawn

Exits (portfolio stop, and the older per-stock stop-loss and take-profit rules other strategies still have) are not checked on every
trade. In the diagram the order down the page is: the rules every trade is checked against, what the strategy decides, the "Rebalance" block (a rebalance that wraps the whole strategy is drawn after it, not as the first block), then "Exits", then the orders. Exits are a block of their own, and they never
hold an order back. "Every trade is checked" has only the limits (budget, most in one stock, liquidity, approval, conditions). On the
Rules tab and Overview they read "Watching", or "Sells" once past their line, not "Holds" or "Broken".
