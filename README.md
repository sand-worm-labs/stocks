# Sandworm Stocks

An AI agent that turns an investor's plain-English brief into a researched, sourced, constraint-checked portfolio of **tokenized stocks**, and trades it onchain only after the investor approves.

Research runs in [Sandworm](https://app.sandwormlab.xyz/) notebooks, which already query onchain data. This repo adds the parts Sandworm doesn't have: turning a brief into a mandate, building a portfolio, enforcing constraints, approval, and execution.

> **Status:** early. This repo is a Next.js scaffold with no agent logic yet. This README describes what we are building, what we reuse from Sandworm, and what is still open. See [Current state](#current-state).

## The idea

A user writes:

> "I want to invest $10,000. I'm bullish on AI and robotics over the next 5 years. I don't want exposure to oil companies, and no single company should be more than 15% of my portfolio."

The agent takes it from there:

```
brief → mandate → research (Sandworm notebook) → portfolio → constraint check → proposal → approval → onchain execution
```

It is not a chatbot that suggests tickers. Every claim has a source, some limits can never be crossed, and no money moves without the user's sign-off.

## Why tokenized stocks

A tokenized stock is an onchain token that tracks a public company's share price (for example Backed's xStocks or Ondo Global Markets). That makes two things possible that a normal brokerage doesn't give an agent:

- **Research has two halves, and Sandworm can see the second.** The company itself (earnings, financials, competitors) comes from filings and market data. The token (liquidity, holders, trading volume, how far its price drifts from the underlying share) is onchain data a Sandworm notebook can query directly.
- **Execution is a transaction the user signs.** The agent builds the swap, the user approves it in their own wallet, and the trade settles onchain. Approval is a signature on the exact transaction, not a toggle in a UI, and the agent never holds the user's funds.

## How it works

### 1. Understand the brief
The agent turns free text into a structured **mandate**: budget, themes, risk preference, time horizon, exclusions (sectors or companies), and allocation limits (max per position, number of positions, and so on). Anything ambiguous goes back to the user instead of being guessed.

### 2. Research in a Sandworm notebook
Research is done in a Sandworm notebook, not in free-form model output. The agent drives Sandworm through its [MCP server](https://github.com/sand-worm-labs/sandworm-web) (`apps/mcp` in `sandworm-web`):

| Step | Sandworm tool |
|---|---|
| Plan the research, split into sub-goals | `plan_notebook`, `search_tools` |
| Create the notebook and add SQL, Python, chart and markdown cells | `create_notebook`, `add_cell` |
| Fetch data (API keys go in workspace env vars) | Python cells, `set_env_vars` |
| Run it and read the outputs back | `run_notebook`, `get_run_results` |
| Publish the result as a dashboard people can open | `publish_notebook`, `set_dashboard` |
| Re-run on a schedule | `schedule_notebook` |

Because the research lives in a notebook, a reader can open each number, see the code and the data source behind it, and re-run it. A claim the notebook can't back with a fetched source is dropped from the proposal rather than stated anyway.

For each candidate, the notebook answers two questions:

1. **Is the company a good fit?** Earnings, financial statements, trends, competitive position, risks.
2. **Can you actually hold it as a token?** Is the token real and issued by a known provider, how deep is its liquidity, how big a trade it can absorb, who holds it, and how far its price sits from the underlying share.

### 3. Construct the portfolio
The agent picks tokens and assigns weights. Conviction sets the weights and the mandate bounds them.

### 4. Enforce constraints
Constraints are checked in code, not left to the model's good behaviour. See [Hard constraints](#hard-constraints).

### 5. Explain trade-offs
The proposal says why each asset was picked, the main risks, the assumptions, and anything in the brief that couldn't be satisfied, along with what was done about it.

### 6. Approve, then execute onchain
The user reviews the proposal and approves it by signing from their own wallet. Nothing is submitted before that, and a signature covers the exact swaps the user saw. If the portfolio changes, they sign again.

## Hard constraints

**The agent's opinion never overrides the user's constraints.** Constraints are parsed into a machine-checkable form and enforced by a deterministic checker between portfolio construction and the proposal. The model proposes and the checker decides.

| Situation | Required behaviour |
|---|---|
| Research favours a stock beyond the cap (the agent wants NVIDIA at 25%, the cap is 15%) | Clamp to the cap and redistribute the excess. Never exceed it. Say it was clamped and why. |
| A candidate is in an excluded sector or company list (e.g. oil) | Remove it, even if it is the best fit for the theme. |
| The constraints can't all be met (8 positions with a 15% minimum each = 120% of a 100% budget) | Refuse. Say which constraints conflict and what would make the brief feasible. Do **not** produce a portfolio that quietly bends a rule. |
| Weights don't add up to the budget, or a swap would exceed it | The proposal is invalid and is never shown for approval. |
| No tokenized version of a wanted stock exists, or its pool is too thin to fill the order | Leave it out and say so. Never substitute a different asset to fill the weight. |

A violated constraint is a failure, not a trade-off to weigh against returns.

## What Sandworm gives us, and what it doesn't

**Already there** (in `sandworm-web`):

- Notebooks with SQL, Python, chart, pivot-table and input cells, run on a cloud runtime.
- An MCP server (OAuth 2.1) that lets an agent plan, build, run, schedule and publish notebooks, with audit and tool-call logging.
- Dashboards, public publishing, forking and scheduled runs.
- Workspace environment variables for API keys, and a catalog of prebuilt analysis tools (`search_tools`).
- **Onchain data for the token side of the research**: DEX pools, liquidity and volume (GeckoTerminal, DexScreener), token transfers and holders on Base and Ethereum (Blockscout, Etherscan), labelled wallet and holder data (Nansen), and prices and candles (CoinGecko, Coinbase, Kraken).
- **Trusted notebooks** (`packages/trust`): an onchain receipt of exactly which code and inputs a notebook ran, recorded on Monad with the ERC-8004 registries, which a second wallet can re-run and attest. We plan to use this as the audit trail for a proposal. It proves what ran and who ran it. It does not prove the analysis is right.

**Not there, so we build or bring it:**

- **Data on the underlying companies.** Sandworm's built-in sources are onchain and crypto. There is no source for earnings, financial statements or filings. Notebooks can fetch from public APIs in Python cells, so we will add those sources the same way, with keys in workspace env vars.
- **A registry of tokenized stocks.** A list of which tokens map to which company, their issuer and contract address, and on which chain. Without it the agent can't tell a real tokenized share from a lookalike. This must be verified per token, not assumed.
- The mandate parser, the portfolio construction step, the constraint checker, the approval flow, and swap execution. All of these live in this repo.

## Open decisions

- Which chain to trade on (Base is the likely candidate and Sandworm already reads it), and which tokenized-stock issuers to support first.
- Which DEX or aggregator builds the swaps, and what slippage limit applies.
- Who may use it. Some tokenized stocks are restricted by jurisdiction or require the holder to be verified, and the agent has to treat that as a constraint too.
- Whether the wallet is a plain user wallet or a smart account with spending limits.

## Principles

- **Evidence over assertion.** Sourced claims only. If the data can't support a conclusion, say so.
- **Restraint is a feature.** Refusing an impossible or rule-breaking brief is the correct outcome.
- **Human in the loop for money.** No execution without the user signing the exact transactions.
- **Auditable.** Any position traces back to the brief, the notebook that researched it, the constraint checks and the signed approval.

## Current state

The UI is being built first, on mock data. Screens built: sign-in, Home, Portfolios, Markets, stock detail, Activity and Settings.

The repo has three apps in `apps/`, `apps/web` (the Next.js front end) `apps/api` (the NestJS API and its Postgres) and `apps/mcp` (the MCP server for agents). Inside `apps/web`, the layout follows `sandworm-web/apps/terminal`; paths below are relative to it:

| Folder | Holds |
| --- | --- |
| `src/app` | Routes only. `(app)` is the signed-in shell. |
| `src/components/<Area>` | UI, one PascalCase folder per area. `components/ui` holds the shadcn-style primitives (`Card`, `Badge`, `Table`). |
| `src/lib/<area>` | An area's types, logic and tests. `source.ts` is how an area reads its data. |
| `src/constants` | Labels, status and tone maps, filters, navigation. |
| `src/config` | Routes (a page not built yet has `isBuilt: false` and renders as plain text) and site info. |
| `src/hooks` | Hooks. |
| `src/_mockdata` | Mock data. |

**Removing the mock data.** Components never import it. Only the `lib/<area>/source.ts` files do, and ESLint fails any other import of `@/_mockdata`. To go live, change what those `source.ts` files return, then delete `src/_mockdata`.

It is built on:

- Next.js 15 (App Router), React 19, strict TypeScript
- Tailwind CSS v4 with Sandworm's tokens and fonts, copied from `sandworm-web`
- Vitest, React Testing Library, Playwright, Storybook
- ESLint, Prettier, conventional commits, T3 Env for typed env vars
- A `/api/health` route and Vercel config

Not yet built:

- [ ] Brief → structured mandate
- [ ] Sandworm MCP client: plan, build and run the research notebook
- [ ] Underlying-company data sources for the notebook, with citations
- [ ] Tokenized-stock registry (token ↔ company ↔ issuer ↔ contract)
- [ ] Portfolio construction
- [ ] Deterministic constraint checker, including infeasibility detection
- [ ] Proposal UI with rationale, risks and sources
- [ ] Wallet connection and approval by signature
- [ ] Onchain swap execution
- [ ] Attesting the research notebook with Sandworm's trust layer

## Demo goal

One continuous run that shows:

1. A natural-language brief becoming a **sourced proposal**.
2. A constraint the agent **refuses to break**: clamping an over-weighted pick to the cap, and rejecting a brief that can't be satisfied.
3. The user **approving** the portfolio by signing.
4. The approved swaps being **executed onchain**.

## Getting started

Requires Node.js and [pnpm](https://pnpm.io/) (via Corepack).

```bash
cd apps/web
pnpm install
pnpm dev          # dev server with Turbopack
```

The API and its database: `docker compose up -d` from the repo root (the API is on :4000).

```bash
pnpm build        # production build
pnpm lint         # ESLint
pnpm test         # Vitest
pnpm storybook    # component workbench
```

Environment variables are declared and validated in [env.mjs](env.mjs). Add new ones there instead of reading `process.env` directly.

## Disclaimer

Experimental, and not financial advice. Tokenized stocks carry issuer, liquidity, custody and regulatory risk beyond the underlying shares, and some are not available in every jurisdiction. Swaps move real funds, so start on a testnet or with a small amount.

## License

MIT. See [LICENSE](LICENSE).
