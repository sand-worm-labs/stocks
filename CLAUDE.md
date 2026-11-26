# Conventions for Sandworm Stocks

Four apps in `apps/`: `apps/web` is the Next.js front end, `apps/api` is the NestJS API with the database, `apps/mcp` is the MCP server for agents, `apps/contracts` is the Foundry project for the onchain side (Reactive Network contracts). `docker compose up` (from here) runs the database and the API.

**The API is laid out as Sandworm's is** (`sandworm-web/apps/api`): `src/core` (guards, filters, decorators, pipes), `src/common`, `src/infrastructure` (the database and each outside system) and `src/features/<name>`, each feature holding its own controllers, services, types and constants. A test sits under `test/` at the same path as what it tests.

**The API owns the logic; the web app renders.** The browser and agents call the API; the web app has no API routes of its own (`/api/*` on its origin is passed through to the API). New business rules go in `apps/api`, never in the web app. The web app's server still reads and settles strategies through its own copy in `apps/web/src/lib` while its pages are moved over (see `docs/design/api-owns-the-logic.md`): change the API's copy, and don't add to the web's.

Code here is written to be read. The same rules everywhere, so any file reads like any other.

- **A controller method is a few lines.** A controller people and agents call is marked `@ForPeople()` (it works out who is asking, checks the origin and says errors as `{ error }`), takes the person from `@Asking()` and checks a body with `@Body(new ZodPipe(schema))`. Anything longer than
  about ten lines is logic and belongs in the feature's folder, with a test (see `apps/api/src/features/strategies/trading/start.ts`). A route without `@ForPeople()`, `@ForTheApp()` or `@Public()` is for the web app's server alone, with the service key.
- **One thing per line.** No `(await x()).y` or a call nested in a call nested in an object. Name the step: `const { id } = await create(...)`.
- **Early returns over nesting.** Refuse first (`if (!ok) return ...`), then do the work. No `else` after a `return` or `throw`.
- **Names say what it is.** `createSchema`, `isResearching`, `changesSomething`; never `body`/`data`/`x` when something specific is meant.
  A boolean reads as a question (`isReady`, `hasMode`).
- **Comments say why, not what.** Above anything that isn't obvious, one or two plain sentences. No comment that repeats the code.
- **Small functions, one job.** A function that does two things is two functions. A file that needs a table of contents is too long.
- **Types are checked.** `tsc --noEmit`, `eslint` and the tests (`vitest run` in web and mcp, `pnpm test` in api, with `TEST_DATABASE_URL` set for the database ones) pass before a commit. No `any`; a cast needs a reason beside it.
- **The database is changed only by a migration**, and only the API (`apps/api`) has one: TypeORM migrations in `apps/api/src/infrastructure/database/migrations`, run when the API boots. The web app (`apps/web`) has no database.
- **Whatever a person can do in the app, an agent can do through `apps/mcp`.** The MCP server only calls the API's routes for people (with the agent's token, which `@ForPeople()` accepts), so a new
  action is a new route first, then a tool in `apps/mcp/src/tools`, listed in `apps/mcp/src/parity.ts`. `apps/mcp`'s `parity.test.ts` fails when a route has no tool.
- **Market data is fetched by the API, never by the web app.** Yahoo, CoinGecko and DexScreener are called only from `apps/api/src/infrastructure/datasource`, which keeps the answers (and the CoinGecko key). The web app asks it
  through `apps/web/src/lib/api/market.ts`, so a page still draws when it is down. A new market call is a new endpoint in that module first.

