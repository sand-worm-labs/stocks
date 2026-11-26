import withBundleAnalyzer from "@next/bundle-analyzer"
import { type NextConfig } from "next"

import { env } from "./env.mjs"

const API_URL = env.STOCKS_API_URL ?? "http://localhost:4000"

const config: NextConfig = {
  // A second dev server can keep its own cache folder, so one that has gone wrong never spoils the other
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  reactStrictMode: true,
  // The repo's root has a lockfile of its own, for the one command that starts every server. Without saying where this app is, Next takes that
  // folder for the project and compiles from there.
  turbopack: { root: __dirname },
  outputFileTracingRoot: __dirname,
  // Opening the dev server through a tunnel is a request from another origin, and its scripts are refused without this
  allowedDevOrigins: ["*.ngrok-free.dev", "*.ngrok-free.app"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "financialmodelingprep.com", pathname: "/image-stock/**" },
      { protocol: "https", hostname: "coin-images.coingecko.com" },
      { protocol: "https", hostname: "assets.coingecko.com" },
    ],
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  // The strategies used to live under /portfolios: old links and bookmarks go to where they are now
  redirects: async () => [
    { source: "/portfolios", destination: "/strategies", permanent: true },
    { source: "/portfolios/:path*", destination: "/strategies/:path*", permanent: true },
  ],
  // This app has no API of its own: `/api/*` is the Stocks API, passed through so the browser stays on one origin and its cookie with it
  rewrites: async () => [
    ...["/healthz", "/api/healthz", "/health", "/ping"].map((source) => ({ source, destination: `${API_URL}/health` })),
    { source: "/api/:path*", destination: `${API_URL}/:path*` },
  ],
}

export default env.ANALYZE ? withBundleAnalyzer({ enabled: env.ANALYZE })(config) : config
