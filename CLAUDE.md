# Conventions for Sandworm Stocks

Code here is written to be read. The same rules everywhere, so any file reads like any other.

- **A route is a few lines.** Every API route has the same shape: `respond(request, { body?, status? }, async ({ ownerId, body }) => result)` from
  `src/lib/api/respond.ts` (it does the origin, sign-in and body checks; a route never touches the request itself). Anything longer than
  about ten lines is logic and belongs in `src/lib/<area>/`, with a test (see `src/lib/trade/start.ts`).
- **One thing per line.** No `(await x()).y` or a call nested in a call nested in an object. Name the step: `const { id } = await create(...)`.
- **Early returns over nesting.** Refuse first (`if (!ok) return ...`), then do the work. No `else` after a `return` or `throw`.
- **Names say what it is.** `createSchema`, `isResearching`, `changesSomething`; never `body`/`data`/`x` when something specific is meant.
  A boolean reads as a question (`isReady`, `hasMode`).
- **Comments say why, not what.** Above anything that isn't obvious, one or two plain sentences. No comment that repeats the code.
- **Small functions, one job.** A function that does two things is two functions. A file that needs a table of contents is too long.
- **Types are checked.** `tsc --noEmit`, `eslint` and `vitest run` pass before a commit. No `any`; a cast needs a reason beside it.
- **The database is changed only by a migration** (`drizzle/`, run by `pnpm db:migrate`, which `pnpm dev` and `pnpm start` run first).
