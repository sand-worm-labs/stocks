# Database schema: first design

Drafted 2026-11-24. **Decided:** Stocks has its own Postgres (not the main app's), accounts come from the main Sandworm app, and the tool is Drizzle.
**Built:** the schema in `src/db/schema.ts`, the first migration `drizzle/0000_init.sql`, `pnpm db:generate` / `pnpm db:migrate`, and tests that run the
migration on PGlite. **Also built:** the Postgres store on these tables (`src/lib/store/postgres.ts`, `ledger.ts`), tested against the same contract as the file store. **Not built yet:** the move of onboarding/settings/notifications/chat off cookies and memory.
The SQL below is the design; the schema file is the source of truth.

## Where we are

- One table exists, `strategies`: a few columns (owner, name, status, dates) and everything else in one `data jsonb` document (rules, strategy
  tree, report, orders, holdings, cash, funding, events). Behind the `StrategyStore` seam in `src/lib/store`.
- Everything else is cookies, browser storage or memory: the account is only an id inside a signed cookie (the Dynamic user id), onboarding is
  four cookies, notification read/archived is browser storage, settings are mock, chat history is in the chat server's memory, and activity is
  made up from the strategies.
- Holdings and cash are stored as the latest snapshot. Nothing records _what happened_, so Add funds / Sell cannot be marked on the chart and a
  time-weighted return is impossible.

## Principles

1. **Never hold money.** No balances we own, no keys, no treasury. We store _approvals_ people signed and _receipts_ of trades they made
   (transaction hashes), so everything can be checked against the chain.
2. **A ledger, not a snapshot.** What a strategy holds is the sum of what happened to it. Holdings, cash, cost, the value chart's markers and
   returns are all derived from it.
3. **Columns for what is looked up, joined or must be unique; `jsonb` for what changes shape with the product** (rule specs, the strategy tree,
   the report, settings). The existing store already works this way; it stays.
4. **Accounts belong to the main Sandworm app.** People are the main app's `users` (uuid ids, NestJS + TypeORM). We never create, rename or
   delete accounts. We keep a `profiles` row per account for what is only about Stocks (region, interests, first-run state, settings), made the
   first time that account signs in. Everything we own points at `profiles.user_id`, so our tables never depend on the main app's database
   being the same one.
5. **Money is `numeric`, never float.** USDC to 6 places, stock-token units to 18, prices to 8.
6. **Market data is not stored.** Prices, stocks and benchmarks stay live from their source (cached in memory). Revisit if we need our own price
   history.

## Tables

### People

The account itself (email, username, password, social login) stays in the main app's `users` table; we only ever hold its id.

```sql
-- One row per main-app account that has used Stocks, made on first sign-in (upsert). `user_id` is the main app's users.id.
create table profiles (
  user_id          uuid primary key,
  display_name     text,                         -- what chat and the welcome use; null = "Trader 7f3a". Starts as the account's name.
  region           text,                         -- ISO country; decides whether tokenized stocks are offered
  interests        text[] not null default '{}', -- the themes picked in onboarding
  onboarded_at     timestamptz,                  -- null = still to do the first-run stepper (replaces the sw_* cookies)
  welcome_seen_at  timestamptz,
  settings         jsonb not null default '{}',  -- risk, rules, notifications, connector URL
  created_at       timestamptz not null default now()
);

-- Wallets a person has used here. Read-only knowledge: the address, never a key.
create table wallets (
  user_id    uuid not null references profiles on delete cascade,
  address    text not null check (address = lower(address)),
  chain_id   integer not null,
  linked_at  timestamptz not null default now(),
  primary key (user_id, chain_id, address)
);
```

There is no `identities` table: the main app already owns how a person signs in. The session cookie stays a signed token (no sessions table);
it will carry the main app's user id, which is what "Continue with Sandworm" returns.

**The wallet sign-in we have today is a bridge.** It identifies people by their Dynamic id, which is not a main-app account id. Accounts made
that way are test data: when Sandworm sign-in goes live they are not merged into real accounts, they are dropped (or, if anyone has real
strategies on one, linked by hand through `wallets`). Wallets then become a thing an account connects to trade with, not a way in.

### Strategies

```sql
create table strategies (
  id               text primary key,             -- the existing id format, so URLs keep working
  owner_id         uuid not null references profiles,
  name             text not null,
  brief            text not null,                -- their words
  status           text not null,                -- live | draft | unbuildable (the existing PortfolioStatus)
  stage            text,                         -- draft only: how far it has got
  mode             text check (mode in ('paper', 'wallet')),  -- set when it goes live
  current_version  integer not null default 1,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  started_at       timestamptz,
  closed_at        timestamptz
);
create index on strategies (owner_id, created_at desc);

-- What a strategy *is*, kept per version, so "refine" (v2) never overwrites what was tested and traded
create table strategy_versions (
  strategy_id  text not null references strategies on delete cascade,
  version      integer not null,
  rules        jsonb not null,                   -- RuleSpec[]
  spec         jsonb not null,                   -- the Strategy tree
  summary      jsonb not null,                   -- "Your idea" rows
  assumption   text not null default '',
  budget       numeric(24,6) not null,
  created_at   timestamptz not null default now(),
  primary key (strategy_id, version)
);

-- One run of research on a version: a stand-in's or Sandworm's, with the report it produced
create table research_runs (
  id           uuid primary key default gen_random_uuid(),
  strategy_id  text not null,
  version      integer not null,
  source       text not null,                    -- 'standin' | 'sandworm'
  status       text not null,                    -- running | ready | failed
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  report       jsonb,
  orders       jsonb,                            -- what buying it would place
  foreign key (strategy_id, version) references strategy_versions on delete cascade
);
create index on research_runs (strategy_id, started_at desc);
```

### Starting with a wallet, and what happened after

```sql
-- The signed approval to start: which strategy, whose wallet, how much at most, until when. Kept so a start can be checked later.
create table trade_approvals (
  id            uuid primary key default gen_random_uuid(),
  strategy_id   text not null references strategies on delete cascade,
  wallet        text not null check (wallet = lower(wallet)),
  chain_id      integer not null,
  max_amount    numeric(24,6) not null,          -- USDC, fees included
  message       text not null,                   -- the exact words signed, rebuilt by the server
  signature     text not null,
  balance_seen  numeric(24,6) not null,          -- what the wallet held when it was checked
  expires_at    timestamptz not null,
  created_at    timestamptz not null default now(),
  unique (strategy_id)                           -- a strategy starts once, so an approval is used once
);

-- Everything that happened to a strategy's money and holdings. Append only: a mistake is corrected by a new row, not an edit.
create table ledger (
  id           bigint generated always as identity primary key,
  strategy_id  text not null references strategies on delete cascade,
  kind         text not null check (kind in ('deposit', 'withdraw', 'buy', 'sell', 'fee')),
  symbol       text,                             -- for buy / sell
  units        numeric(38,18),                   -- stock-token units bought (+) or sold (-)
  price        numeric(24,8),                    -- unit price it settled at
  usdc         numeric(24,6) not null,           -- effect on the strategy's cash: spend is negative
  fee          numeric(24,6) not null default 0,
  impact       numeric(12,8),                    -- price impact, as a fraction
  tx_hash      text,                             -- null for paper trading
  chain_id     integer,
  at           timestamptz not null default now(),
  check ((kind in ('buy', 'sell')) = (symbol is not null and units is not null))
);
create index on ledger (strategy_id, at);
create unique index on ledger (chain_id, tx_hash, symbol) where tx_hash is not null;  -- a receipt is counted once
```

**Derived, not stored:** cash is `sum(usdc)`; units held per symbol is `sum(units)`; cost and entry price come from the buys (average cost, as
`lib/portfolios` already works it out). A view, `positions`, gives units per strategy and symbol; cost basis is computed in code, where the rule
for it lives. If reads get slow, a `positions` table updated in the same transaction as each ledger row is the cache, never the source.

This is what unblocks the open chart items: deposit and sell markers are ledger rows, and `valueHistory` can use real units at each moment.

### Activity and notifications

```sql
-- What the agent and the app did, for the activity page and the alerts. Replaces the `events` list inside a strategy.
create table activity (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles on delete cascade,
  strategy_id  text references strategies on delete set null,
  kind         text not null,                    -- the ACTIVITY_KIND ids
  title        text not null,
  detail       text not null default '',
  data         jsonb not null default '{}',      -- rule, request, checks, link
  ledger_id    bigint references ledger,         -- the trade it is about, if any
  at           timestamptz not null default now()
);
create index on activity (user_id, at desc);
create index on activity (strategy_id, at desc);

-- Read / put away, per person (replaces browser storage)
create table activity_state (
  user_id      uuid not null references profiles on delete cascade,
  activity_id  uuid not null references activity on delete cascade,
  read_at      timestamptz,
  archived_at  timestamptz,
  primary key (user_id, activity_id)
);
```

### Community chat

```sql
create table chat_messages (
  id       uuid primary key default gen_random_uuid(),   -- uuidv7 if available, so ids sort by time
  room     text not null check (room ~ '^0x[0-9a-f]{40}$'),
  user_id  uuid not null references profiles on delete cascade,
  name     text not null,                                -- the name at the time; a later rename doesn't rewrite history
  text     text not null check (char_length(text) <= 280),
  at       timestamptz not null default now()
);
create index on chat_messages (room, at desc);
```

The chat server loads the last 50 of a room from here when the first person joins it, and writes each message as it is said. Trade alerts in
the chat stay live-only.

## What does not get a table

- **Sessions and chat tickets:** signed tokens, stateless.
- **Prices, stock lists, benchmarks, the catalog of ideas:** live from their sources.
- **Strategy _drafts_ in progress** are just `strategies` rows with `status = 'draft'`.
- **Demo strategies** (the 40 made-up ones) stay generated in code, never inserted.

## How we get there

1. Pick the tool (below), add migrations as plain SQL files that are safe to run on any Postgres.
2. `0001`: profiles, wallets, and the new strategy tables. A one-off script copies each existing `strategies.data` document into
   `strategies` + `strategy_versions` + `research_runs` + `ledger` (an opening `deposit` and `buy` rows from its holdings), and its `events` into
   `activity`. Existing strategies belong to Dynamic ids, which are not main-app accounts: they are
   test data, dropped or re-owned by hand (see the wallet bridge above).
3. Keep the `StrategyStore` seam: the Postgres store reads these tables and returns the same `StrategyRecord`, so the app above it does not change.
   The file store stays for first runs without a database.
4. Move onboarding, settings and notification state from cookies/browser storage to `profiles` / `activity_state`, one at a time.
5. Chat persistence.
6. Tests run on PGlite (already a dependency) with the same migrations, so what the tests run is what production runs.

## Decisions

Made: own database; Drizzle; accounts from the main app (`profiles` keyed by its user id).

Still open:

1. **What does Sandworm sign-in give us?** From the token the main app issues I need the user id (uuid) and ideally a name and email, and how it
   is verified (a shared secret, their public key, or a call to their API). This is what `identify("sandworm", token)` will do.
2. **Orders:** `orders` (requested, signed, submitted, settled, failed) is not a table until real execution exists (swaps signed by the person);
   it would sit between `research_runs.orders` and `ledger`.
3. **Chat retention:** keep everything, or the last N days per room?

## Working with it

- Change `src/db/schema.ts`, run `pnpm db:generate`, commit the new file in `drizzle/`, run `pnpm db:migrate` on the database.
- Set `DATABASE_URL` to the new Postgres (Neon). The old `strategies` table the file/Postgres store made (id, owner_id, data...) has the same name:
  use a fresh database, or drop that table first.
