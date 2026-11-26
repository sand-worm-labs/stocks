# Stocks MCP

The MCP server for Sandworm Stocks: everything the app lets a person do, for an agent such as Claude to do for them.

It holds no logic of its own. Each tool is one call to the Stocks API (`apps/api`), the same one the web app uses, made with the agent's own token, so the API decides who the agent is and what it may do.

```
pnpm install
pnpm start   # serves POST /mcp on :4100 (PORT to change), and GET /health
```

| Setting | What it is | Default |
|---|---|---|
| `STOCKS_API_URL` | Where this server calls the API | `http://localhost:4000` |
| `STOCKS_WEB_PUBLIC_URL` | Where a person's browser reaches the web app (it is the sign-in) | `http://localhost:3001` |
| `MCP_PUBLIC_URL` | Where agents reach this server | `http://localhost:4100` |
| `PORT` | Port to listen on | `4100` |

## Connecting an agent

Add `<MCP_PUBLIC_URL>/mcp` to the agent (in Claude: Settings, Connectors, Add custom connector). It does the rest, the standard MCP sign-in:

1. The agent asks the server for the sign-in details and is told to use the web app (`/.well-known/oauth-protected-resource`).
2. It registers itself with the app and opens the app in the person's browser. They sign in with their wallet as they always do, and see a "Connect Claude to Sandworm Stocks" window with Allow and Cancel.
3. On Allow the agent is given a token of its own for that person (an hour, refreshed for 30 days). Every call after that is made as them, with the same limits as the app.

A token that has run out is answered with the standard 401, so the agent refreshes it by itself. For trying things without the browser step, set `STOCKS_AGENT_TOKEN` and `STOCKS_AGENT_OWNER_ID` on the API and send `Authorization: Bearer <that token>`.

## Trying it without browser sign-in or AI credit

```
./scripts/mcp-test.sh        # from stocks/: restarts the API with research by an agent, makes a test token, prints how to connect
pnpm --dir apps/mcp smoke    # a scripted run of every tool over the real protocol (makes one strategy in the token's account)
./scripts/mcp-test.sh --stop # puts the API back to normal
```

With `RESEARCH_PRODUCER=agent` (what the script sets) confirming a strategy's rules does not start Sandworm's own AI, which needs credit: the strategy
waits, and the connected agent does the research (with Sandworm's MCP connected as well, to build the notebook) and hands it back with `submit_research`.
The test token is `STOCKS_AGENT_TOKEN`, for the account in `STOCKS_AGENT_OWNER_ID`; both are kept in the git-ignored `.env` beside `docker-compose.yml`.

## Keeping up with the app

`src/parity.ts` lists every call the API has for people and the tool that does it. `pnpm test` reads the API's controllers and fails if a call has no tool, so an action can't be added to the app that an agent can't do. A call that isn't for agents (signing in, the browser's chat ticket) is listed in `NOT_FOR_AGENTS` with why.

`src/research-result.ts` is a copy of the API's research result schema, so an agent is told what shape to build; a test fails when the two differ.
