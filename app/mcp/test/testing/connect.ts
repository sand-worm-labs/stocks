import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js"
import { vi } from "vitest"

import { createServer } from "../../src/server"
import type { Web } from "../../src/web"

// The app, stood in for: every call answers `{ ok: true }` unless a test says otherwise, and can be asked what it was called with
export const fakeWeb = (): { [K in keyof Web]: ReturnType<typeof vi.fn> } => ({
  get: vi.fn().mockResolvedValue({ ok: true }),
  post: vi.fn().mockResolvedValue({ ok: true }),
  patch: vi.fn().mockResolvedValue({ ok: true }),
})

// An agent connected to the server, as it would be, over a pipe in memory
export async function connect(web: Web) {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair()
  await createServer(web).connect(serverSide)
  const client = new Client({ name: "test", version: "0" })
  await client.connect(clientSide)
  return client
}

export const textOf = (result: Awaited<ReturnType<Client["callTool"]>>) => (result.content as { text: string }[])[0]?.text ?? ""
