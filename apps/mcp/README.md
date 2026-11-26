# Stocks MCP

The MCP server for Sandworm Stocks: everything the app lets a person do, for an agent such as Claude to do for them.

It holds no logic of its own. Each tool is one call to the web app's API (`apps/web/src/app/api`), made with the agent's own token, so the app decides who the agent is and what it may do.

```
pnpm install
STOCKS_WEB_URL=http://localhost:3000 pnpm start   # serves POST /mcp on :4100 (PORT to change), and GET /health
```

| Setting | What it is | Default |
|---|---|---|
| `STOCKS_WEB_URL` | Where this server calls the web app | `http://localhost:3000` |
| `STOCKS_WEB_PUBLIC_URL` | Where a person's browser reaches the web app (it is the sign-in) | `STOCKS_WEB_URL` |
| `MCP_PUBLIC_URL` | Where agents reach this server | `http://localhost:4100` |
| `PORT` | Port to listen on | `4100` |

## Connecting an agent

Add `<MCP_PUBLIC_URL>/mcp` to the agent (in Claude: Settings, Connectors, Add custom connector). It does the rest, the standard MCP sign-in:

1. The agent asks the server for the sign-in details and is told to use the web app (`/.well-known/oauth-protected-resource`).
2. It registers itself with the app and opens the app in the person's browser. They sign in with their wallet as they always do, and see a "Connect Claude to Sandworm Stocks" window with Allow and Cancel.
3. On Allow the agent is given a token of its own for that person (an hour, refreshed for 30 days). Every call after that is made as them, with the same limits as the app.

A token that has run out is answered with the standard 401, so the agent refreshes it by itself. For trying things without the browser step, set `STOCKS_AGENT_TOKEN` and `STOCKS_AGENT_OWNER_ID` on the web app and send `Authorization: Bearer <that token>`.

## Keeping up with the app

`src/parity.ts` lists every API call of the web app and the tool that does it. `pnpm test` reads the web app's route files and fails if a call has no tool, so an action can't be added to the app that an agent can't do. A call that isn't for agents (signing in, the browser's chat ticket) is listed in `NOT_FOR_AGENTS` with why.

`src/research-result.ts` is a copy of the web app's research result schema, so an agent is told what shape to build; a test fails when the two differ.
