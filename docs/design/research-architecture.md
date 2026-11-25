# Research on Sandworm: how a strategy gets its results

Written 2026-11-25. Built and tested this session unless marked **not tested**.

## The idea in one picture

```
confirm rules ─▶ research run (strategy is "researching", mode "waiting")
                    │ one producer fills it (RESEARCH_PRODUCER):
                    ├─ (unset)    stand-in: timed run, template report            lib/pipeline
                    ├─ sandworm   our server → Sandworm API as the person         lib/sandworm
                    └─ agent      Claude → Stocks MCP, builds notebooks with
                                  Sandworm's MCP, then submits                    lib/mcp
                    ▼
        service.completeResearch(strategy, ResearchResult)     lib/strategies/service.ts
          (owner-checked, only while waiting, once, validated, notebook links must lead to Sandworm)
                    ▼
        Results tab: headline, summary, metrics, one chart, links to the full notebooks   components/Report/ResearchResultView.tsx
```

Producers differ only in how they get a `ResearchResult` (`lib/research/result.ts`). Everything after that is shared, so a better
researcher replaces a producer and nothing else.

## The result is small on purpose

`ResearchResult`: headline, summary, up to 8 metrics, one chart, up to 8 notes, 1 to 8 notebook links, and `isExample` (made-up data, which
the page says). The full work is in the Sandworm notebooks; Stocks shows the answer and the way in. Every field is bounded because some of it
is written by a model.

## The three producers

**sandworm** (`lib/sandworm/`), the default whenever `SANDWORM_API_URL` is set. On "Confirm rules" it:
1. gets real daily prices for the plan's stocks and the S&P 500 (SPY) from Yahoo (`lib/research/prices.ts`, 3 years, the same days for all);
2. builds two notebooks in the signed-in person's own Sandworm workspace (`notebooks.ts`): **Backtest** (growth vs the S&P 500, return a year,
   Sharpe, beta, alpha, last 12 months) and **Risk** (worst fall, worst month, share of the risk by stock, the portfolio stop). The test is plain
   python in the notebook, readable and re-runnable: the plan's weights, looked at again every 21 trading days, 0.4% on every trade, and the
   portfolio stop from the rules;
3. runs them, and reads back the lines they print (`STOCKS_RESULT {json}`; each under the 4,000 characters Sandworm keeps of a cell's output);
4. writes the result (`producer.ts`, `toResult`): every number comes from a notebook, the sentences are written from those numbers and from what
   the person asked for (their panic level, their max per stock). A notebook that prints nothing, or a cell that errors, fails the run.

The run reports each step as it goes (`research.progress`), with the notebook's link as soon as the notebook exists, so the sidebar and the
waiting card show the real run. The client (`client.ts`) is Sandworm's API as one person and makes the same calls as Sandworm's MCP.
The person's Sandworm login comes from the cookies its Dynamic login sets, which Stocks used to throw away. Both tokens are kept sealed
(AES-GCM, key from `AUTH_SECRET`) in the `sw_sandworm` cookie, and an access token that has run out is renewed from the refresh token
(`getSandwormToken`). With no login (signed in before this existed) confirming is refused with "sign out and in again", before the rules lock.

What the test does not do: model a token drifting from its share or a pool's depth; use anything but the plan's static weights (it does not
re-run the strategy tree); say anything about the future. The summary says so.

**agent** (`lib/mcp/`, `POST /api/mcp`). A Stocks MCP server with three tools: `list_research_requests`, `get_strategy`, `submit_research`.
An agent reads what is waiting, builds notebooks with Sandworm's MCP, and submits what they show. It cannot trade, move money or change
rules. This is how research is tested with Claude's own credit instead of the Sandworm workspace's. Auth today: one token for one person
(`STOCKS_AGENT_TOKEN` / `STOCKS_AGENT_OWNER_ID`), enough for your own strategies. Letting anyone connect their own agent needs a token per
person, made when they connect (the way Sandworm's MCP does it with OAuth): `lib/mcp/auth.ts` is the one place to change.

**stand-in**. Unchanged: a timed run and a template report, so the app works with nothing connected.

## Making Sandworm's own AI work for Stocks

The AI that writes notebooks lives in `sandworm-web/apps/ai` (services `agent`, `block_planner`, `prompt_rules`, `sandworm_tools`), reached
through the API's chat. **Not read in depth yet.** What Stocks needs from it is already fixed by the contract above, so the work is:

1. A Stocks mode for the agent: rules that say what a strategy research notebook is (read prices, test the rules, one notebook per result
   such as performance, risk, holdings) and what it must end with (the `STOCKS_RESULT` line per notebook).
2. A producer that sends the brief and rules as a chat turn on a new notebook, as the person, and waits for the run to finish.
   It is a new `plan` in `createSandwormProducer`, or a sibling producer, in `lib/research/source.ts`.
3. Bounded cost: the producer, not the agent, decides how many notebooks and turns a run may use.

Until then the same contract can be met by an agent outside (the agent producer) with Sandworm's MCP.

## How to try each

- **Agent (Claude):** set `RESEARCH_PRODUCER=agent`, `STOCKS_AGENT_TOKEN`, `STOCKS_AGENT_OWNER_ID`; restart. Add the MCP to Claude Code:
  `claude mcp add --transport http stocks http://localhost:3001/api/mcp --header "Authorization: Bearer <token>"`. Confirm a strategy's
  rules in the app, then ask Claude: "research the waiting strategy in Stocks". Verified here with the same calls by hand: list, notebooks
  built and run with Sandworm's MCP, submit, results page renders with both notebook links.
- **Sandworm producer:** sign out and in once (so the Sandworm login is kept), create a strategy, confirm its rules.
  Tested: the notebook python runs for real in the unit tests on synthetic prices, and the same engine and chart cells ran in Sandworm
  (a validation notebook: success, result line returned); the client and producer against a fake that follows the real calls; the result
  built from real three-year prices renders on the Results page. **Not tested end to end**: the app calling Sandworm with a real login.

## Known gaps

- A failed run can't be retried from the page yet (confirm is once only); a new strategy is the way round it.
- The research page (`/strategies/[id]/research`) is still the static mock; the strategy page itself polls and moves on when ready.
- The agent token is one fixed token for one person.
- The sidebar chat box is still scripted: it shows the real run and findings, but typing to it doesn't reach a model. Next: send the message to Sandworm's chat (or a model) with the result and the notebooks as context.
- The backtest holds the plan's weights; it does not evaluate the strategy tree (momentum picks, rebalance on drift) day by day.
