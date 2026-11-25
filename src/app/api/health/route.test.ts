import { afterEach, describe, expect, it, vi } from "vitest"

import { connect } from "@/db/client"
import { GET } from "./route"
import journal from "../../../../drizzle/meta/_journal.json"

vi.mock("@/db/client", () => ({ connect: vi.fn() }))

const withMigrations = (applied: number) =>
  vi.mocked(connect).mockReturnValue({ execute: async () => [{ applied }] } as never)

describe("GET /api/health", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.mocked(connect).mockReset()
  })

  it("is fine without a database, where strategies are kept in a file", async () => {
    vi.stubEnv("DATABASE_URL", "")
    expect((await GET()).status).toBe(200)
  })

  it("is fine when every migration has run", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://x")
    withMigrations(journal.entries.length)
    expect((await GET()).status).toBe(200)
  })

  it("says it is behind when a migration has not run, or the table is missing", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://x")
    withMigrations(journal.entries.length - 1)
    expect((await GET()).status).toBe(503)

    vi.mocked(connect).mockReturnValue({
      execute: async () => {
        throw new Error('relation "drizzle.__drizzle_migrations" does not exist')
      },
    } as never)
    expect((await GET()).status).toBe(503)
  })
})
