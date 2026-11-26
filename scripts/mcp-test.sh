#!/usr/bin/env bash
# Gets the Stocks MCP ready to be tried by an agent (Claude), with no browser sign-in and no AI credit on Sandworm:
#   - the API is restarted with RESEARCH_PRODUCER=agent, so research waits for the agent to do it and hand it back through the MCP
#   - one fixed test token is made (kept in the `.env` beside docker-compose.yml) and tied to one account, so the agent acts as that person
#   - the MCP server is started if it isn't running, and the exact commands to connect an agent are printed
# Run it from anywhere: ./scripts/mcp-test.sh [--owner <user id>] [--standin] [--connect] [--stop]
# --connect also adds the server to Claude Code (for every folder), with the real token, so nothing has to be copied by hand.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"
ENV_FILE="$ROOT_DIR/.env"
MCP_PORT="${MCP_PORT:-4100}"
OWNER=""
PRODUCER="agent"
CONNECT=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --owner) OWNER="$2"; shift 2 ;;
    --standin) PRODUCER="standin"; shift ;;
    --connect) CONNECT=true; shift ;;
    --stop)
      # Back to how the app normally runs: no test token, and Sandworm's own research
      sed -i '' -e '/^STOCKS_AGENT_TOKEN=/d' -e '/^STOCKS_AGENT_OWNER_ID=/d' -e '/^RESEARCH_PRODUCER=/d' "$ENV_FILE" 2>/dev/null || true
      docker compose up -d --wait api
      echo "✓ The API is back to normal: no test token, and research the way the app is set up."
      exit 0 ;;
    -h|--help) sed -n 2,8p "$0"; exit 0 ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
done

fail() { echo "✗ $1" >&2; exit 1; }
set_env() { # set_env NAME VALUE: put NAME=VALUE in .env, replacing an earlier one
  touch "$ENV_FILE"
  grep -v "^$1=" "$ENV_FILE" > "$ENV_FILE.tmp" || true
  echo "$1=$2" >> "$ENV_FILE.tmp"
  mv "$ENV_FILE.tmp" "$ENV_FILE"
}
current() { grep "^$1=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- || true; }

command -v docker > /dev/null && docker info > /dev/null 2>&1 || fail "Docker is not running"

# Whose account the agent acts as: the one given, or the one that has the most strategies (yours, if you have been using the app)
if [ -z "$OWNER" ]; then OWNER="$(current STOCKS_AGENT_OWNER_ID)"; fi
if [ -z "$OWNER" ]; then
  docker compose up -d --wait db > /dev/null
  OWNER="$(docker compose exec -T db psql -U stocks -d stocks -Atc "select owner_id from strategies where owner_id <> '00000000-0000-4000-8000-000000000000' group by owner_id order by count(*) desc limit 1" | tr -d '[:space:]')"
fi
[ -n "$OWNER" ] || fail "No account found yet. Sign in to the app once, or pass --owner <user id>"
[[ "$OWNER" =~ ^[0-9a-f-]{36}$ ]] || fail "That is not a user id: $OWNER"

TOKEN="$(current STOCKS_AGENT_TOKEN)"
[ -n "$TOKEN" ] || TOKEN="stocks-test-$(openssl rand -hex 20)"
set_env STOCKS_AGENT_TOKEN "$TOKEN"
set_env STOCKS_AGENT_OWNER_ID "$OWNER"
set_env RESEARCH_PRODUCER "$PRODUCER"

echo "▶ Restarting the API with research by: $PRODUCER"
docker compose up -d --build --wait api

# The MCP server: left alone if `pnpm dev` already runs it
if ! curl -fsS "http://localhost:$MCP_PORT/health" > /dev/null 2>&1; then
  echo "▶ Starting the MCP server on :$MCP_PORT (in the background; log: /tmp/stocks-mcp.log)"
  [ -d apps/mcp/node_modules ] || pnpm --dir apps/mcp install
  (cd apps/mcp && nohup pnpm start > /tmp/stocks-mcp.log 2>&1 &)
  for _ in $(seq 1 30); do curl -fsS "http://localhost:$MCP_PORT/health" > /dev/null 2>&1 && break; sleep 1; done
  curl -fsS "http://localhost:$MCP_PORT/health" > /dev/null 2>&1 || fail "The MCP server did not start. See /tmp/stocks-mcp.log"
fi

# Proof that the token works end to end: the MCP server asks the API who it is
curl -fsS -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' "http://localhost:$MCP_PORT/mcp" > /dev/null || fail "The MCP server refused the test token"

URL="http://localhost:$MCP_PORT/mcp"
if [ "$CONNECT" = true ]; then
  command -v claude > /dev/null || fail "The claude command is not installed"
  # Removing needs the scope named, and an earlier copy may be in either (a stale token in one wins over a good one in the other)
  for scope in local user project; do claude mcp remove sandworm-stocks --scope "$scope" > /dev/null 2>&1 || true; done
  claude mcp add --scope user --transport http sandworm-stocks "$URL" --header "Authorization: Bearer $TOKEN" > /dev/null
  echo "✓ Added sandworm-stocks to Claude Code for every folder. Start a new Claude Code session, or run /mcp to reconnect."
fi
cat <<DONE

✓ Ready. The agent acts as $OWNER, and research is done by: $PRODUCER

Claude Code:
  claude mcp add --transport http sandworm-stocks $URL --header "Authorization: Bearer $TOKEN"

Claude Desktop (claude_desktop_config.json, then restart it):
  { "mcpServers": { "sandworm-stocks": { "command": "npx", "args": ["-y", "mcp-remote", "$URL", "--header", "Authorization: Bearer $TOKEN"] } } }

MCP Inspector (a page to call each tool by hand):
  npx @modelcontextprotocol/inspector   # transport: Streamable HTTP, URL: $URL, header Authorization: Bearer $TOKEN

A scripted run of every tool:
  pnpm --dir apps/mcp smoke

For research, the agent also needs Sandworm's own MCP connected (it builds the notebooks there). Put things back with: ./scripts/mcp-test.sh --stop
DONE
