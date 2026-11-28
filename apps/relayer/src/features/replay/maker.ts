import { maxUint256, type Address } from "viem"
import type { Call } from "../../infrastructure/base-sepolia/send.js"
import { faucetAbi, routerAbi, tokenAbi } from "../../infrastructure/base-sepolia/testnet.abis.js"
import type { Testnet } from "../../infrastructure/base-sepolia/testnet-clients.js"
import type { ReplayContracts } from "../../core/config/relay.config.js"
import type { Copy } from "./copies.js"
import type { Trade } from "./trades.js"

// A trade with the copy it is made in
export type CopyTrade = Trade & { copy: Copy }

export function tokenInOf({ copy, isToken0In }: CopyTrade): Address {
  return isToken0In ? copy.token0 : copy.token1
}

function tokenOutOf({ copy, isToken0In }: CopyTrade): Address {
  return isToken0In ? copy.token1 : copy.token0
}

// What each token the maker pays in must be, to make all the trades
function amountsNeeded(trades: CopyTrade[]): Map<Address, bigint> {
  const needed = new Map<Address, bigint>()
  for (const trade of trades) {
    const token = tokenInOf(trade)
    needed.set(token, (needed.get(token) ?? 0n) + trade.amountIn)
  }
  return needed
}

// The maker is the relayer's own wallet, which owns the test tokens' minting. So it never runs out: what it lacks it mints, and it lets the router take
// what it pays in. Both are calls to make first, before any trade, because a trade is priced before it is sent.
export async function fundingCalls(chain: Testnet, contracts: ReplayContracts, trades: CopyTrade[]): Promise<Call[]> {
  const maker = chain.wallet.account?.address
  if (!maker) throw new Error("the wallet client has no account")

  const calls: Call[] = []
  for (const [token, needed] of amountsNeeded(trades)) {
    const [balance, allowance] = await Promise.all([
      chain.testnet.readContract({ address: token, abi: tokenAbi, functionName: "balanceOf", args: [maker] }),
      chain.testnet.readContract({ address: token, abi: tokenAbi, functionName: "allowance", args: [maker, contracts.router] }),
    ])
    if (balance < needed) calls.push(mintCall(contracts, token, maker, needed - balance))
    if (allowance < needed) calls.push({ address: token, abi: tokenAbi, functionName: "approve", args: [contracts.router, maxUint256] })
  }
  return calls
}

// Test USDC is minted by its owner; every other token by the faucet that made it, for its owner
function mintCall(contracts: ReplayContracts, token: Address, to: Address, amount: bigint): Call {
  if (token.toLowerCase() === contracts.usdc.toLowerCase()) return { address: token, abi: tokenAbi, functionName: "mint", args: [to, amount] }
  return { address: contracts.faucet, abi: faucetAbi, functionName: "ownerMint", args: [token, to, amount] }
}

// The swap in the copy, as the maker would make it: as much as the mainnet's traders put in, for whatever it pays out
export function swapCall(contracts: ReplayContracts, maker: Address, trade: CopyTrade): Call {
  const params = {
    tokenIn: tokenInOf(trade),
    tokenOut: tokenOutOf(trade),
    tickSpacing: trade.copy.tickSpacing,
    recipient: maker,
    deadline: 0n,
    amountIn: trade.amountIn,
    amountOutMinimum: 0n,
    sqrtPriceLimitX96: 0n,
  }
  return { address: contracts.router, abi: routerAbi, functionName: "exactInputSingle", args: [params] }
}
