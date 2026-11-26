import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    // Signs the sign-in nonce and the session. A random string of 32 characters or more, kept secret.
    AUTH_SECRET: z.string().min(32).optional(),
    // The Stocks API, which keeps everything that is stored (see apps/api), and the key the two share. Without them strategies are kept in a
    // file, which is for trying the app, not for real use.
    STOCKS_API_URL: z.string().url().optional(),
    STOCKS_API_KEY: z.string().min(1).optional(),
    // The main Sandworm app's API, with its /api prefix. Signing in with a wallet makes the person's Sandworm account there (the web app's
    // `POST /auth/dynamic/login`), and their id is that account's. Without it the app keeps to Dynamic's own id, for working locally.
    SANDWORM_API_URL: z.string().url().optional(),
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
    // The blog post that explains what Sandworm Stocks does in plain English, which the welcome's "Learn more" opens. Without it, the blog.
    NEXT_PUBLIC_LEARN_MORE_URL: z.string().url().optional(),
    // From the Dynamic dashboard (Developer, SDK & API Keys). Without it, wallets and sign-in are switched off.
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID: z.string().uuid().optional(),
  },
  runtimeEnv: {
    ANALYZE: process.env.ANALYZE,
    SANDWORM_API_URL: process.env.SANDWORM_API_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    STOCKS_API_URL: process.env.STOCKS_API_URL,
    STOCKS_API_KEY: process.env.STOCKS_API_KEY,
    NEXT_PUBLIC_WEB_APP_URL: process.env.NEXT_PUBLIC_WEB_APP_URL,
    NEXT_PUBLIC_LANDING_URL: process.env.NEXT_PUBLIC_LANDING_URL,
    NEXT_PUBLIC_LEARN_MORE_URL: process.env.NEXT_PUBLIC_LEARN_MORE_URL,
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
  },
})
