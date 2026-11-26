# The API owns the logic; the web app only renders

Decided on 2026-11-26, after an architecture review (candidates 1 to 7). The Next.js web app (`apps/web`) becomes very slim: screens, routing, the
wallet-connect button and the pages' own state. The NestJS API (`apps/api`) is the one backend, for the web app and for the MCP server alike.

## Decisions

The target is the main Sandworm web (`sandworm-web/apps/web`): a client app. The browser talks to the NestJS API directly with an httpOnly cookie and
`credentials: "include"`, and the web app has **no Next.js API routes**. Even its OAuth consent page is a thin page over the API's own endpoints.

| | Decision |
|---|---|
| Next keeps | Screens, routing, the wallet-connect button and the pages' own state. Pages fetch from the API (in the browser, or on the server with the person's cookie forwarded). No API routes, no business rules, no data of its own. |
| Who calls the API | The browser, directly, as the person (session cookie). Not through Next. The shared service key between Next and the API goes away. |
| One origin | The API is reached at `/api/*` on the same origin as the web app (a rewrite in `next.config.ts` in production and in development), as the main Sandworm does (`app.sandwormlab.xyz/api`). The cookie then needs no CORS and no cross-site setting. |
| Sign-in | The API verifies the wallet signature, makes the account and sets the session cookie. Next's middleware only checks the same signed cookie to redirect to `/signin`. |
| Agents | The MCP server and the agent OAuth endpoints (register, token, authorize context, confirm) live in the API, as `mcp-oauth` does in the main Sandworm. The "Connect to Sandworm Stocks" page stays a thin page over them. The parity rule checks the API's routes. |
| Demo strategies | Removed from the product (real strategies only), once the move reaches them. Not yet done. |
| Naming | `strategy` everywhere, replacing `portfolio` (about 1,375 uses), with a `GLOSSARY.md`. Not yet done. |

## Where it stands (2026-11-26)

- **Done.** The Next API routes are gone. The API answers the same paths for the browser (through the `/api` rewrite) and for the MCP server (directly): sign-in and
  sign-out, strategies and every step on them, activity, markets, chat tickets and agent OAuth. It works out who is asking from the session cookie or an agent's token
  (`PersonGuard`). The business logic and its tests are copied into `apps/api/src/lib`.
- **Not done.** The web app's server pages still read strategies through their own copy of the logic (`apps/web/src/lib/strategies`) and the service key
  (`/internal/strategies`), so that logic exists twice. Next: pages ask the API with the person's cookie forwarded, then the web copy, the file store and the service key
  are deleted. The realtime server (`apps/web/src/server`) and the agent consent page's request check also still use web `lib`.
- **To settle before deploying.** Behind the rewrite every browser request reaches the API from the web server's address: set `TRUST_PROXY=true` there so the rate
  limit counts each person. The API needs the web app's `AUTH_SECRET`, `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID`, `SANDWORM_API_URL` and `REALTIME_WS_URL`.

## Slices, in order (each tested and committed, the app working after each)

Slices 3 to 6 are done on the API's side; what is left of them is the web pages calling it. Slice 0 is done except `GET /me`, which the pages will need. Slice 2 (one owner for the ledger and the strategy's standing) is not started.

0. **The API knows who is asking.** Session cookie guard (replacing the service key), `GET /me`, wallet sign-in and sign-out, the `/api` rewrite in Next. After this the
   browser can call the API as the person.
1. **The update seam** (candidate 3). DONE. A strategy has a `revision`; a save names the revision it read and is refused (409) if the strategy has moved on. The API locks
   the row while it checks; the web service retries system steps from a fresh read (`afresh`) and drops stale progress. Migration `1764300000000-StrategyRevision`.
2. **The ledger and the strategy's standing** (candidates 4 and 1), moved into the API.
3. **The strategy lifecycle** (create, confirm, finish, retry, rename, edit rules, share) in the API; the pages call it; `app/api/strategies/**` routes deleted.
4. **Research** (producers, Sandworm client, brief, result) in the API. Needs the person's Sandworm login there: open question below.
5. **Trading** (start, funds, sell, the signed-approval check).
6. **Agent OAuth and the MCP server** into the API; `app/api/oauth`, `.well-known` and the rest of `app/api/**` deleted.

## Open

- (Settled) The person's Sandworm login stays a sealed cookie, now set and read by the API (`SandwormSession`).
- How each slice is tested so the web app keeps working between them (API tests against Postgres via `TEST_DATABASE_URL`, web tests against a fake API).

## Conventions that change when their slice lands

- `CLAUDE.md`: "a route is a few lines" becomes a rule about the API's controllers; the web app has no API routes and no business rules.
- The MCP server is part of the API (or calls it), and its parity list is the API's routes.
