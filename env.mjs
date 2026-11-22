import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    // Signs the sign-in nonce and the session. A random string of 32 characters or more, kept secret.
    AUTH_SECRET: z.string().min(32).optional(),
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
    // From the Dynamic dashboard (Developer, SDK & API Keys). Without it, wallets and sign-in are switched off.
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID: z.string().uuid().optional(),
  },
  runtimeEnv: {
    ANALYZE: process.env.ANALYZE,
    AUTH_SECRET: process.env.AUTH_SECRET,
    NEXT_PUBLIC_WEB_APP_URL: process.env.NEXT_PUBLIC_WEB_APP_URL,
    NEXT_PUBLIC_LANDING_URL: process.env.NEXT_PUBLIC_LANDING_URL,
    NEXT_PUBLIC_DOCS_URL: process.env.NEXT_PUBLIC_DOCS_URL,
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
  },
})
