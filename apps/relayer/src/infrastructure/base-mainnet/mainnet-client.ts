import { createPublicClient, http, type PublicClient } from "viem"

// The read client gets no chain object: reads do not need one, and a chain with its own transaction types does not fit the generic client type.
// A scan asks for 50,000 blocks of logs at a time, which a public RPC can take longer than viem's 10 seconds to answer.
export function connectMainnet(rpcUrl: string, timeoutMs?: number): PublicClient {
  return createPublicClient({ transport: http(rpcUrl, { timeout: timeoutMs }) })
}
