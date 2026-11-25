# The strategy flow, from idea to trading

Written 2026-11-24. It works end to end without Sandworm's AI: a stand-in agent makes the rules, strategy, report and orders from what the
person typed, and every piece that will be replaced sits behind one small seam.

## The path

1. **Idea** (`/strategies/new/brief`, or the stock picker, or "Start research" on a stock page): sending calls `POST /api/strategies`, which
   reads the idea, asks the agent to design it, and keeps a draft. The person's own words open the agent chat.
2. **Rules** (`/strategies/<id>`, one page that grows): the name can be changed in place (`PATCH /api/strategies/<id>`). "Confirm rules"
   (`POST .../confirm`) locks them and starts the research.
3. **Research**: the progress plays, then `POST .../ready` marks the results ready. A reload mid-way picks it up again.
4. **Results**: the report from that research. Also on the strategy's Results tab (`/strategies/<id>/report`) afterwards.
5. **Review and trade** (`POST .../trade`): _Paper trading_ saves it as live with nothing involved. _My wallet_ is **non-custodial**: no money is
   sent to us or to any wallet of ours. The person signs an approval that names the strategy, the most it may use of their own USDC, and
   when it ends; the server checks the signature and reads the wallet's balance on Base Sepolia (read-only), then the strategy goes live.
   The USDC never leaves their wallet. This test version records the approval; the on-chain trades from the wallet come next.

The step bar (Idea, Rules, Research, Results, Trade) shows on every one of these pages, the single draft page included.

## Where things live

| What                    | Where                                                    | To replace it                                                                                                                                                                                                                                                                                   |
| ----------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Storage                 | `src/lib/store` (`getStore`)                             | A file by default, Postgres when `DATABASE_URL` is set: the tables in `src/db/schema.ts` (design: `docs/design/database-schema.md`), made by `pnpm db:migrate`. A strategy is spread over them and put back together as one record by `postgres.ts`; what it holds is its ledger (`ledger.ts`). |
| The agent               | `src/lib/pipeline` (`getPipeline`)                       | Write a `Pipeline` (`design`, `research`) that calls Sandworm and return it from `source.ts`.                                                                                                                                                                                                   |
| Rules of the flow       | `src/lib/strategies/service.ts`                          | Owner checks, allowed steps, filling the plan. Tested; independent of storage and the agent.                                                                                                                                                                                                    |
| Browser to API          | `src/lib/strategies/client.ts`, `src/app/api/strategies` | Point the client at another API; the routes are thin.                                                                                                                                                                                                                                           |
| Approving from a wallet | `src/lib/trade/authorize.ts`, `BuyReview`                | The server checks the signature and the balance on the chain; the browser's word is never taken.                                                                                                                                                                                                |

The pages read through `lib/<area>/source.ts`: a strategy made here comes first, and the made-up ones fill out the rest (their number is the
"demo data" setting).

## What the agent stand-in does, and does not

It reads the idea with the app's own parser, picks stocks from the market (a named theme or company, else the most liquid), and builds the
rules (budget, most in one stock, liquidity, ask first, a stop on the whole strategy at the loss limit), a strategy (strongest few by six
months, steadier ones larger, rebalance on drift), and orders at today's prices. **It runs no backtest.** The report's figures are the
template's, and the report says so in a banner, in the verdict ("Example results") and in the trade dialog. A real backtest on
`src/lib/strategy/backtest.ts` and real prices is the natural next step.

## Security

- Every API route goes through `respond()`: same-origin only, a signed-in owner, a validated body. A strategy that isn't yours is "not found".
- Each step checks the strategy is at the right point, so none can be skipped or done twice.
- **We never hold money.** There is no treasury or deposit wallet. Starting with a wallet is a signed approval, not a transfer.
- The approval says in words which strategy, which wallet, how much (fees included) and until when (at most 15 minutes). The server rebuilds
  those words itself, so a signature can't be moved onto another strategy, amount or wallet, and a kept signature goes stale.
- The wallet must hold at least that much USDC on Base Sepolia, read from the chain by the server. Signatures from smart-contract wallets
  work too.
- A strategy can only go live once, and only the step before it allows it, so an approval can't start it twice.

## To switch on

- `DATABASE_URL`: a Postgres (Neon works). Without it strategies live in `.data/strategies.json` locally and in a temp folder on Vercel, which
  is lost. The tables are made and kept up to date by `pnpm db:migrate`, which `pnpm dev` and `pnpm start` run first (an old `strategies` table from before the migrations is renamed `strategies_legacy`, not deleted); `GET /api/health` is a 503 while a migration is missing. Locally, `docker compose up -d db` gives a throwaway Postgres (`DATABASE_URL=postgresql://stocks:stocks@localhost:5433/stocks`); `docker compose down -v` empties it. Owners must be account ids (uuids), which Dynamic's and the main app's are; with sign-in switched off the one local person has `LOCAL_USER_ID`.
- Test USDC: https://faucet.circle.com (Base Sepolia).

## Known gaps

- No activity log for a strategy's own events (created, confirmed, bought) yet.
- A strategy's value over time is just its fill; the live prices move it in the browser.
- One edit at a time: the store is last write wins, which is fine for one person using one strategy.
- The wallet approval has not been exercised with a real wallet here; the check was tested with real signatures and stand-in chain reads.
- Nothing executes on the chain yet: trades from the person's wallet (swaps into the stock tokens) are the step after this, and will be signed by them.

## The value chart (home and strategy page)

- **What it shows:** what the strategy is worth over time, worked out from real prices (`lib/portfolios/history.ts`: units × price at each moment). Nothing is recorded or scheduled; it is a pure calculation, cached for 5 minutes per window (`lib/markets/history.ts`: day / week / month by age).
- **Benchmarks** use real fund prices over the same window (`benchmarkLines(..., funds)`); a fund with no prices is left out, never faked. Strategies that are only examples keep the old made-up line.
- **Controls:** `Value | Return` toggle on the chart. Return (%) is the fair way to compare against funds and ignores how much was put in. Tooltip shows value or return, plus the gap against the first compared fund.
- **Markers:** `ChartEvent`s from `getChartData` (only "started" today). **Open:** Add funds / Sell are not persisted, so they can't be marked yet. Once a ledger exists, `valueHistory` should use it (units change at each event) and a time-weighted return replaces the plain one.
- **Live edge:** the last point is the live-price value at the clock (`withLiveEnd`); `HomeSummaryLive` ticks every 30s. The chart is no longer rebuilt when a point is appended (`ready` dependency), only repainted.
