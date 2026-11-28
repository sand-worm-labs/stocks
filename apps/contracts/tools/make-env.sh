#!/usr/bin/env bash
# Makes apps/contracts/.env from .env.example: the public RPC addresses filled in, and a new wallet for testing. Run it from anywhere.
#
#   tools/make-env.sh                 a new throwaway wallet, its key written to .env
#   tools/make-env.sh --no-key        leave PRIVATE_KEY empty, to sign with a Foundry keystore instead (--account NAME)
#   tools/make-env.sh --force         replace an existing .env (the old one is kept as .env.bak-<time>)
#   tools/make-env.sh --out PATH      write somewhere else (to try it)
#
# It never prints the key, and it never overwrites a .env without --force. The wallet is for TEST NETWORKS ONLY: its key sits in a plain file.
# The addresses are the ones on https://dev.reactive.network/origins-and-destinations when this was written; they have changed before, so check them.
set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$HERE/.env"
WANT_KEY=1
FORCE=0

while [ $# -gt 0 ]; do
  case "$1" in
    --no-key) WANT_KEY=0 ;;
    --force) FORCE=1 ;;
    --out) OUT="${2:?--out needs a path}"; shift ;;
    -h | --help) sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown option: $1 (try --help)" >&2; exit 2 ;;
  esac
  shift
done

command -v cast > /dev/null || { echo "cast is not installed: https://getfoundry.sh" >&2; exit 1; }
[ -f "$HERE/.env.example" ] || { echo "no .env.example in $HERE" >&2; exit 1; }

if [ -e "$OUT" ]; then
  if [ "$FORCE" -ne 1 ]; then
    echo "$OUT already exists, so nothing was changed. Use --force to replace it (the old one is kept)." >&2
    exit 1
  fi
  BACKUP="$OUT.bak-$(date +%Y%m%d-%H%M%S)"
  mv "$OUT" "$BACKUP"
  echo "kept the old file as $BACKUP"
fi

# Public, read-only addresses. Base Sepolia's callback proxy is the one Reactive lists for it.
LASNA_RPC_URL="https://lasna-rpc.rnk.dev/"
BASE_RPC_URL="https://mainnet.base.org"
BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
CALLBACK_PROXY_ADDR="0x476F44b11F5C942c58f4c8E3d0300E5710743585"

ADDRESS=""
KEY=""
if [ "$WANT_KEY" -eq 1 ]; then
  WALLET="$(cast wallet new --json)"
  ADDRESS="$(printf '%s' "$WALLET" | python3 -c 'import json,sys; w=json.load(sys.stdin); w=w[0] if isinstance(w,list) else w; print(w["address"])')"
  KEY="$(printf '%s' "$WALLET" | python3 -c 'import json,sys; w=json.load(sys.stdin); w=w[0] if isinstance(w,list) else w; print(w["private_key"])')"
fi

# Owner-only from the first byte, so the key is never readable by anyone else, even for a moment
umask 077
{
  echo "# Made by tools/make-env.sh on $(date -u +%Y-%m-%dT%H:%MZ). Never committed. For test networks only."
  [ -n "$ADDRESS" ] && echo "# Wallet address: $ADDRESS"
  cat "$HERE/.env.example"
} > "$OUT"

# Replaces the value of a KEY= line, whatever it was
set_var() {
  python3 - "$OUT" "$1" "$2" << 'PY'
import re, sys
path, name, value = sys.argv[1:4]
text = open(path).read()
text = re.sub(r'^' + re.escape(name) + r'=.*$', lambda _: name + '=' + value, text, flags=re.M)
open(path, 'w').write(text)
PY
}

set_var LASNA_RPC_URL "$LASNA_RPC_URL"
set_var BASE_RPC_URL "$BASE_RPC_URL"
set_var BASE_SEPOLIA_RPC_URL "$BASE_SEPOLIA_RPC_URL"
set_var DESTINATION_RPC_URL "$BASE_SEPOLIA_RPC_URL"
set_var CALLBACK_PROXY_ADDR "$CALLBACK_PROXY_ADDR"
[ -n "$KEY" ] && set_var PRIVATE_KEY "$KEY"
chmod 600 "$OUT"

echo "wrote $OUT (owner-only)"
if [ -n "$ADDRESS" ]; then
  echo "wallet address: $ADDRESS"
  echo "next: send it Base Sepolia ETH, then send some of that to the Reactive faucet (see README) for lREACT"
else
  echo "PRIVATE_KEY is empty: sign with a keystore, e.g. forge create ... --account sandworm-stocks"
fi
echo "left blank on purpose: REACTIVE_RPC_URL (the tools use LASNA_RPC_URL), SEPOLIA_RPC_URL"
