#!/usr/bin/env bash
# Every off-chain action on https://dev.reactive.network/debugging, as one command. They are all `cast` calls: the ones that only read run at once,
# and the ones that spend money (fund, cover-debt) print what they would do and need --yes.
#
#   tools/reactive.sh callbacks <reactive-tx-hash>      the callbacks a reactive transaction asked for, and how each ended
#   tools/reactive.sh debt     <reactive|callback> <contract>
#   tools/reactive.sh reserves <reactive|callback> <contract>
#   tools/reactive.sh status   <reactive|callback> <contract>   debt and reserves, and whether it is in debt
#   tools/reactive.sh fund     <reactive|callback> <contract> <amount> --yes     depositTo: settles debt first, the rest goes to reserves
#   tools/reactive.sh cover-debt <reactive|destination> <contract> --yes          for a contract with a coverDebt() wrapper
#   tools/reactive.sh nonce    <reactive|destination> <wallet>                    when a transaction is "replacement underpriced"
#
# "reactive" is a contract on the Reactive Network, paid in REACT through the system contract; "callback" is a contract on the destination chain,
# paid in that chain's token through its callback proxy. Settings are read from the environment or from apps/contracts/.env:
#   REACTIVE_RPC_URL (or LASNA_RPC_URL)   DESTINATION_RPC_URL   CALLBACK_PROXY_ADDR (different on every chain)   PRIVATE_KEY
#   SYSTEM_CONTRACT_ADDR is the same on every Reactive network, so it defaults to 0x8888...8888
set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
[ -f "$HERE/.env" ] && { set -a; . "$HERE/.env"; set +a; }

command -v cast > /dev/null || { echo "cast is not installed: https://getfoundry.sh" >&2; exit 1; }

SYSTEM_CONTRACT_ADDR="${SYSTEM_CONTRACT_ADDR:-0x8888888888888888888888888888888888888888}"
REACTIVE_RPC="${REACTIVE_RPC_URL:-${LASNA_RPC_URL:-}}"
DESTINATION_RPC="${DESTINATION_RPC_URL:-}"
CALLBACK_PROXY_ADDR="${CALLBACK_PROXY_ADDR:-}"

usage() { sed -n '2,/^set -euo/p' "$0" | sed '$d' | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }
fail() { echo "✗ $1" >&2; exit 1; }
need() { [ -n "$2" ] || fail "$1 is not set (see the settings at the top of this file)"; }

# Which chain and which contract answer for a kind of contract. Sets RPC and LEDGER in this shell (not a subshell), so a missing setting stops the script.
pick() {
  case "$1" in
    reactive) need REACTIVE_RPC_URL "$REACTIVE_RPC"; RPC="$REACTIVE_RPC"; LEDGER="$SYSTEM_CONTRACT_ADDR" ;;
    callback) need DESTINATION_RPC_URL "$DESTINATION_RPC"; need CALLBACK_PROXY_ADDR "$CALLBACK_PROXY_ADDR"; RPC="$DESTINATION_RPC"; LEDGER="$CALLBACK_PROXY_ADDR" ;;
    destination) need DESTINATION_RPC_URL "$DESTINATION_RPC"; RPC="$DESTINATION_RPC"; LEDGER="" ;;
    *) fail "say reactive or callback, not '$1'" ;;
  esac
}

confirmed() { [[ " $* " == *" --yes "* ]]; }
amount_of() { local a; for a in "$@"; do [ "$a" = "--yes" ] || { echo "$a"; return; }; done; }

number() { cast call "$1" "$2" "$3" --rpc-url "$4" | cast to-dec; }

cmd_callbacks() {
  local tx="${1:-}"; [ -n "$tx" ] || usage 1
  pick reactive
  cast call "$SYSTEM_CONTRACT_ADDR" "getCallbacks(uint256)((uint256,address,uint256,uint256,uint256,bytes)[])" "$tx" --rpc-url "$RPC"
  cat <<'NOTE'

Each record has the destination transaction hash and an `err` that is empty on success. An empty list means no record yet, not a failed callback.
If it never arrives, in this order:
  1. gas limit under 100,000      the request is ignored
  2. recipient in debt            the proxy reverts InDebt      -> tools/reactive.sh status callback <contract>
  3. nothing deployed there       the proxy reverts NotAContract (no charge)
  4. gas too low for overhead     delivery fails InsufficientGas
  5. the callback method reverts  CallbackFailure, and it is still charged: onlyServiceProvider (wrong proxy) or onlyCallbackSender (wrong reactive address). Both are immutable: redeploy.
Also: a callback's first argument must be an address, passed as address(0); the Network overwrites it with the reactive contract's address.
NOTE
}

cmd_debt()     { pick "$1"; number "$LEDGER" "debt(address)" "$2" "$RPC"; }
cmd_reserves() { pick "$1"; number "$LEDGER" "reserves(address)" "$2" "$RPC"; }

cmd_status() {
  pick "$1"
  local debt reserves
  debt="$(number "$LEDGER" "debt(address)" "$2" "$RPC")"
  reserves="$(number "$LEDGER" "reserves(address)" "$2" "$RPC")"
  echo "debt:     $debt"
  echo "reserves: $reserves"
  if [ "$debt" != "0" ]; then echo "→ in debt: callbacks to it are refused until it is paid. Fix: tools/reactive.sh fund $1 $2 <amount> --yes"; fi
}

cmd_fund() {
  local kind="$1" contract="$2"; shift 2
  local amount; amount="$(amount_of "$@")"; [ -n "$amount" ] || fail "say how much, such as 1ether or 0.1ether"
  pick "$kind"
  need PRIVATE_KEY "${PRIVATE_KEY:-}"
  echo "depositTo($contract) on $LEDGER with $amount, from the account of PRIVATE_KEY (settles debt first, the rest goes to reserves)"
  confirmed "$@" || fail "this spends funds: add --yes to do it"
  cast send --rpc-url "$RPC" --private-key "$PRIVATE_KEY" "$LEDGER" "depositTo(address)" "$contract" --value "$amount"
}

cmd_cover_debt() {
  local kind="$1" contract="$2"; shift 2
  pick "$kind"; need PRIVATE_KEY "${PRIVATE_KEY:-}"
  echo "coverDebt() on $contract: only works for a contract that has the wrapper. Send it funds first; a plain transfer does not clear debt."
  confirmed "$@" || fail "this changes state: add --yes to do it"
  cast send --rpc-url "$RPC" --private-key "$PRIVATE_KEY" "$contract" "coverDebt()"
}

cmd_nonce() {
  pick "$1"
  echo "nonce: $(cast nonce --rpc-url "$RPC" "$2")"
  echo "For 'replacement underpriced', send again with this nonce and higher prices: cast send ... --nonce <nonce> --gas-price <higher> --priority-gas-price <higher>"
}

action="${1:-}"; [ -n "$action" ] || usage 1; shift || true
case "$action" in
  -h|--help|help) usage 0 ;;
  callbacks)  cmd_callbacks "$@" ;;
  debt|reserves|status|nonce) [ $# -ge 2 ] || usage 1; "cmd_$action" "$@" ;;
  fund|cover-debt) [ $# -ge 2 ] || usage 1; "cmd_${action//-/_}" "$@" ;;
  *) echo "Unknown action: $action" >&2; usage 1 ;;
esac
