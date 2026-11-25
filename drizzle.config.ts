import { defineConfig } from "drizzle-kit"

// `pnpm db:generate` writes a migration into drizzle/ from the schema; `pnpm db:migrate` runs them on DATABASE_URL.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
})
