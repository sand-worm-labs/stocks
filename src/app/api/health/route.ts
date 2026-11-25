import { sql } from "drizzle-orm"

import { connect } from "@/db/client"
import journal from "../../../../drizzle/meta/_journal.json"

// 200 only when the app can use its database: with `DATABASE_URL` set, every migration in drizzle/ must have run. Anything else is a 503
// that says so, instead of pages failing later on a missing column.
export async function GET() {
  const url = process.env.DATABASE_URL
  if (!url) return Response.json({ status: "ok", database: "file" })

  try {
    const rows = await connect(url).execute(sql`select count(*)::int as applied from drizzle.__drizzle_migrations`)
    const applied = (rows as unknown as { applied: number }[])[0]?.applied
    const expected = journal.entries.length
    if (applied === expected) return Response.json({ status: "ok", database: "postgres", migrations: applied })
    return Response.json({ status: "behind", applied, expected, fix: "pnpm db:migrate" }, { status: 503 })
  } catch {
    return Response.json({ status: "behind", fix: "pnpm db:migrate" }, { status: 503 })
  }
}
