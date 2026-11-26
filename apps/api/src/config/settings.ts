import { z } from "zod"

// Everything the API is set up with, from the environment, read here and nowhere else (a test fails on `process.env` anywhere else).
// A value that is set but wrong stops the API with its name, instead of it quietly doing something else.

const RESEARCH_PRODUCERS = ["sandworm", "template", "agent", "standin"] as const
export type ResearchProducer = (typeof RESEARCH_PRODUCERS)[number]

const url = z.string().url().transform((value) => value.replace(/\/$/, ""))
const flag = z.enum(["true", "false"]).transform((value) => value === "true")

const schema = z.object({
  NODE_ENV: z.string().optional(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).optional(),
  PORT: z.coerce.number().int().positive().default(4000),
  TRUST_PROXY: flag.default("false"),

  DATABASE_URL: z.string().optional(),
  DATABASE_SSL: flag.default("false"),

  // Signs sessions, chat passes, share links and agents' tokens. The web app has the same one.
  AUTH_SECRET: z.string().min(32).optional(),
  // Switched off only to work on the app without a wallet
  AUTH_REQUIRED: flag.default("true"),
  // The key the web app's server sends
  STOCKS_API_KEY: z.string().optional(),
  // The fixed agent token, for trying an agent on your own strategies
  STOCKS_AGENT_TOKEN: z.string().optional(),
  STOCKS_AGENT_OWNER_ID: z.string().uuid().optional(),
  NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID: z.string().optional(),

  // The main Sandworm app's API, with its /api prefix, and where its notebooks are opened
  SANDWORM_API_URL: url.optional(),
  SANDWORM_WEB_URL: url.default("https://app.sandwormlab.xyz"),
  RESEARCH_PRODUCER: z.enum(RESEARCH_PRODUCERS).optional(),

  // Where the browser connects for chat
  REALTIME_WS_URL: z.string().url().optional(),

  COINGECKO_API_KEY: z.string().optional(),
  MARKET_CACHE_DIR: z.string().optional(),
})

// A setting left empty in a file ("RESEARCH_PRODUCER=") is one that isn't set
const filled = (environment: NodeJS.ProcessEnv) => Object.fromEntries(Object.entries(environment).filter(([, value]) => value !== ""))

function read(environment: NodeJS.ProcessEnv) {
  const parsed = schema.safeParse(filled(environment))
  if (parsed.success) return parsed.data

  const wrong = parsed.error.issues.map(({ path, message }) => `${path.join(".")}: ${message}`)
  throw new Error(`The API is set up wrong. ${wrong.join("; ")}`)
}

// Read each time it is asked for, so a test can change a setting
export function settings() {
  const env = read(process.env)
  const isProduction = env.NODE_ENV === "production"
  // With Sandworm to ask, its chat does the research unless something else is chosen; without it, the stand-in does
  const defaultProducer: ResearchProducer = env.SANDWORM_API_URL ? "sandworm" : "standin"

  return {
    isProduction,
    logLevel: env.LOG_LEVEL ?? (isProduction ? "info" : "debug"),
    port: env.PORT,
    trustProxy: env.TRUST_PROXY,
    database: { url: env.DATABASE_URL, ssl: env.DATABASE_SSL },
    auth: { secret: env.AUTH_SECRET, isRequired: env.AUTH_REQUIRED, dynamicEnvironmentId: env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID },
    serviceKey: env.STOCKS_API_KEY,
    agent: { token: env.STOCKS_AGENT_TOKEN, ownerId: env.STOCKS_AGENT_OWNER_ID },
    sandworm: { apiUrl: env.SANDWORM_API_URL, webUrl: env.SANDWORM_WEB_URL },
    researchProducer: env.RESEARCH_PRODUCER ?? defaultProducer,
    // Locally the realtime server runs on its own port; anywhere else it has to be said
    realtimeUrl: env.REALTIME_WS_URL ?? (isProduction ? undefined : "ws://localhost:3002"),
    coingeckoKey: env.COINGECKO_API_KEY,
    marketCacheDir: env.MARKET_CACHE_DIR,
  }
}

// What the API can't start without
export function checkSettings() {
  const { database, serviceKey, auth, researchProducer, sandworm } = settings()
  if (!database.url) throw new Error("DATABASE_URL is not set")
  if (!serviceKey) throw new Error("STOCKS_API_KEY is not set")
  if (!auth.secret) throw new Error("AUTH_SECRET is not set. It is the web app's, 32 characters or more")

  const needsSandworm = researchProducer === "sandworm" || researchProducer === "template"
  if (needsSandworm && !sandworm.apiUrl) throw new Error(`RESEARCH_PRODUCER=${researchProducer} needs SANDWORM_API_URL`)
}
