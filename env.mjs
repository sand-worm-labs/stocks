import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    ANALYZE: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => value === "true"),
  },
  client: {
    // Where the main Sandworm app runs. Sign-in happens there.
    NEXT_PUBLIC_WEB_APP_URL: z.string().url().default("http://localhost:8081"),
    // The marketing site, which hosts the Terms and Privacy Policy.
    NEXT_PUBLIC_LANDING_URL: z.string().url().default("http://localhost:8080"),
    NEXT_PUBLIC_DOCS_URL: z.string().url().default("https://github.com/sand-worm-labs/sandworm-web"),
  },
  runtimeEnv: {
    ANALYZE: process.env.ANALYZE,
    NEXT_PUBLIC_WEB_APP_URL: process.env.NEXT_PUBLIC_WEB_APP_URL,
    NEXT_PUBLIC_LANDING_URL: process.env.NEXT_PUBLIC_LANDING_URL,
    NEXT_PUBLIC_DOCS_URL: process.env.NEXT_PUBLIC_DOCS_URL,
  },
})
