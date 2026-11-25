import { defineConfig } from "vitest/config"

// Tests live in test/, laid out as src/ is, and never beside the code they test
export default defineConfig({ test: { include: ["test/**/*.test.ts"] } })
