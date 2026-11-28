#!/usr/bin/env bash
# Finds a salt that makes a test stock's address start and end like its mainnet twin's, so 0xb2000000...d3176ee4af1102d on Base becomes
# 0xb200...102d on the test network. Each extra digit multiplies the search by 16: 4 + 4 digits is about 4 billion tries (minutes), 6 + 4 is days.
#
#   tools/mine-vanity.sh <faucet> "<name>" <symbol> <mainnet token address> [prefix digits = 4] [suffix digits = 4]
#
# Prints the salt and the address it gives. Then: FAUCET=... STOCK_NAME=... STOCK_SYMBOL=... SALT=<salt> forge script script/CreateStock.s.sol ...
set -euo pipefail

if [ "$#" -lt 4 ]; then
  sed -n 2,8p "$0" | sed 's/^# \{0,1\}//'
  exit 1
fi

faucet="$1"
name="$2"
symbol="$3"
twin="${4#0x}"
prefix_digits="${5:-4}"
suffix_digits="${6:-4}"

starts_with="${twin:0:prefix_digits}"
ends_with="${twin: -suffix_digits}"

creation_code="$(forge inspect TestStock bytecode)"
arguments="$(cast abi-encode 'constructor(string,string)' "$name" "$symbol")"
init_code_hash="$(cast keccak "${creation_code}${arguments#0x}")"

echo "looking for 0x${starts_with}...${ends_with} (the twin is 0x${twin})" >&2
cast create2 --deployer "$faucet" --init-code-hash "$init_code_hash" --starts-with "$starts_with" --ends-with "$ends_with"
