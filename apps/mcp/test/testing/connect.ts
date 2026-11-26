import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js"
import { vi } from "vitest"

import { createServer } from "../../src/server"
import type { Api } from "../../src/api"

// The app, stood in for: every call answers `{ ok: true }` unless a test says otherwise, and can be asked what it was called with
export const fakeApi = (): { [K in keyof Api]: ReturnType<typeof vi.fn> } => ({
  get: vi.fn().mockResolvedValue({ ok: true }),
  post: vi.fn().mockResolvedValue({ ok: true }),
  patch: vi.fn().mockResolvedValue({ ok: true }),
  put: vi.fn().mockResolvedValue({ ok: true }),
  delete: vi.fn().mockResolvedValue({ ok: true }),
})

// An agent connected to the server, as it would be, over a pipe in memory
export async function connect(api: Api) {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair()
  await createServer(api).connect(serverSide)
  const client = new Client({ name: "test", version: "0" })
  await client.connect(clientSide)
  return client
}

export const textOf = (result: Awaited<ReturnType<Client["callTool"]>>) => (result.content as { text: string }[])[0]?.text ?? ""
