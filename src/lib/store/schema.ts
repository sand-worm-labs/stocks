// The table strategies are kept in, as the statements that make it (one each, so any driver can run them). The columns are what is looked up or must be unique (who owns it, when); everything else about a strategy changes shape as the product does, so it is one JSON document. Applied once, when the store is
// first used; `if not exists` makes that safe to repeat. To move to another Postgres, run this there and copy the rows.
export const SCHEMA = [
  `create table if not exists strategies (
  id text primary key,
  owner_id text not null,
  name text not null,
  brief text not null,
  status text not null,
  stage text not null,
  data jsonb not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  started_at timestamptz
)`,
  "create index if not exists strategies_owner_idx on strategies (owner_id, created_at desc)",
]
