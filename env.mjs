import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    // Signs the sign-in nonce and the session. A random string of 32 characters or more, kept secret.
    AUTH_SECRET: z.string().min(32).optional(),
    // A CoinGecko "Demo" API key (free). Without one the feed is shared and rate-limited, and can refuse a deployed app.
    COINGECKO_API_KEY: z.string().optional(),
    // Where strategies are kept: any Postgres (Neon, or the main app's). Without it they are kept in a file, which is for trying the app,
    // not for real use.
    DATABASE_URL: z.string().url().optional(),
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
    // The blog post that explains what Sandworm Stocks does in plain English, which the welcome's "Learn more" opens. Without it, the blog.
    NEXT_PUBLIC_LEARN_MORE_URL: z.string().url().optional(),
    // From the Dynamic dashboard (Developer, SDK & API Keys). Without it, wallets and sign-in are switched off.
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID: z.string().uuid().optional(),
  },
  runtimeEnv: {
    ANALYZE: process.env.ANALYZE,
    COINGECKO_API_KEY: process.env.COINGECKO_API_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    NEXT_PUBLIC_WEB_APP_URL: process.env.NEXT_PUBLIC_WEB_APP_URL,
    NEXT_PUBLIC_LANDING_URL: process.env.NEXT_PUBLIC_LANDING_URL,
    NEXT_PUBLIC_DOCS_URL: process.env.NEXT_PUBLIC_DOCS_URL,
    NEXT_PUBLIC_LEARN_MORE_URL: process.env.NEXT_PUBLIC_LEARN_MORE_URL,
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID,
  },
})
