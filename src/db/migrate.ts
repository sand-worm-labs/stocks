import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import postgres from "postgres"

// Brings DATABASE_URL up to date: `pnpm db:migrate`, and before `pnpm dev` and `pnpm start` so the code can't run ahead of its tables.
// Safe to run again. With `--if-configured` it does nothing when there is no DATABASE_URL (the app then keeps strategies in a file).
async function main() {
  const url = process.env.DATABASE_URL
  if (!url && process.argv.includes("--if-configured")) return
  if (!url) throw new Error("DATABASE_URL is not set")

  const sql = postgres(url, { max: 1 })
  try {
    // A `strategies` table from before these migrations (it holds a `data` column and has no `mode`) would stop the first one, so it is put
    // aside, not deleted: it is still there as `strategies_legacy`.
    const [old] = await sql`
      select 1 from information_schema.tables where table_schema = 'public' and table_name = 'strategies'
      and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'strategies' and column_name = 'mode')`
    if (old) {
      await sql`alter table strategies rename to strategies_legacy`
      console.log("Put the old strategies table aside as strategies_legacy")
    }
    await migrate(drizzle(sql), { migrationsFolder: "drizzle" })
    console.log("Migrations are up to date")
  } finally {
    await sql.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
