import withBundleAnalyzer from "@next/bundle-analyzer"
import { type NextConfig } from "next"

import { env } from "./env.mjs"

const config: NextConfig = {
  // A second dev server can keep its own cache folder, so one that has gone wrong never spoils the other
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  reactStrictMode: true,
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
  rewrites: async () => [
    { source: "/healthz", destination: "/api/health" },
    { source: "/api/healthz", destination: "/api/health" },
    { source: "/health", destination: "/api/health" },
    { source: "/ping", destination: "/api/health" },
  ],
}

export default env.ANALYZE ? withBundleAnalyzer({ enabled: env.ANALYZE })(config) : config
