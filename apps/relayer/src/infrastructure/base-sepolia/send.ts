import type { Abi, Address, Hex, WalletClient } from "viem"
import type { Testnet } from "./testnet-clients.js"

export type Call = { address: Address; abi: Abi; functionName: string; args?: readonly unknown[] }

export type Outcome = { call: Call; result: { hash: Hex } | { error: unknown } }

// Sends one transaction and waits for the receipt, so a call that reverted is an error here and not a gap found later.
export async function send(chain: Testnet, call: Call): Promise<Hex> {
  const hash = await submit(chain, call)
  await confirm(chain, call, hash)
  return hash
}

// Sends the calls one after another, each with the next nonce, and then waits for all their receipts together: a few blocks for the lot, not one each.
// A call that cannot be sent (it would revert) is left out and does not take a nonce, so it cannot leave a gap that holds back the ones after it.
// The calls must not depend on each other, because the later ones are tried before the earlier ones are in a block.
export async function sendMany(chain: Testnet, calls: Call[]): Promise<Outcome[]> {
  const account = chain.wallet.account
  if (!account) throw new Error("the wallet client has no account")
  if (calls.length === 0) return []

  let nonce = await chain.testnet.getTransactionCount({ address: account.address, blockTag: "pending" })
  const outcomes: Promise<Outcome>[] = []
  for (const call of calls) {
    try {
      const hash = await submit(chain, call, nonce)
      nonce++
      outcomes.push(confirm(chain, call, hash).then(() => ({ call, result: { hash } }), (error: unknown) => ({ call, result: { error } })))
    } catch (error) {
      outcomes.push(Promise.resolve({ call, result: { error } }))
    }
  }
  return Promise.all(outcomes)
}

async function submit(chain: Testnet, call: Call, nonce?: number): Promise<Hex> {
  const account = chain.wallet.account
  if (!account) throw new Error("the wallet client has no account")

  // viem types each call by its ABI; the calls here are checked by the tests and by the chain, so the ABI is loose at this one seam
  const request = { ...call, account, chain: chain.wallet.chain, nonce } as Parameters<WalletClient["writeContract"]>[0]
  return chain.wallet.writeContract(request)
}

async function confirm(chain: Testnet, call: Call, hash: Hex): Promise<void> {
  const receipt = await chain.testnet.waitForTransactionReceipt({ hash })
  if (receipt.status !== "success") throw new Error(`${call.functionName} reverted in ${hash}`)
}
