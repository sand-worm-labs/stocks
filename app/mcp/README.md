# Stocks MCP

The MCP server for Sandworm Stocks: everything the app lets a person do, for an agent such as Claude to do for them.

It holds no logic of its own. Each tool is one call to the web app's API (`app/web/src/app/api`), made with the agent's own token, so the app decides who the agent is and what it may do.

```
pnpm install
STOCKS_WEB_URL=http://localhost:3000 pnpm start   # serves POST /mcp on :4100 (PORT to change), and GET /health
```

On the web app set `STOCKS_AGENT_TOKEN` and `STOCKS_AGENT_OWNER_ID` (see its `.env.example`). Point the agent at `http://localhost:4100/mcp` with `Authorization: Bearer <that token>`.

## Keeping up with the app

`src/parity.ts` lists every API call of the web app and the tool that does it. `pnpm test` reads the web app's route files and fails if a call has no tool, so an action can't be added to the app that an agent can't do. A call that isn't for agents (signing in, the browser's chat ticket) is listed in `NOT_FOR_AGENTS` with why.

`src/research-result.ts` is a copy of the web app's research result schema, so an agent is told what shape to build; a test fails when the two differ.
