import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative, sep } from "node:path"

const API = join(import.meta.dirname, "../../../web/src/app/api")
const METHOD = /export\s+(?:async\s+function|const)\s+(GET|POST|PUT|PATCH|DELETE)\b/g

function routeFiles(folder: string): string[] {
  return readdirSync(folder).flatMap((name) => {
    const full = join(folder, name)
    if (statSync(full).isDirectory()) return routeFiles(full)
    return name === "route.ts" ? [full] : []
  })
}

// Every call the web app's API has, read from its route files, as "POST /api/strategies/[id]/trade"
export function appCalls() {
  return routeFiles(API).flatMap((file) => {
    const path = "/api/" + relative(API, join(file, "..")).split(sep).join("/")
    const source = readFileSync(file, "utf8")
    return [...source.matchAll(METHOD)].map(([, method]) => `${method} ${path.replace(/\/$/, "")}`)
  })
}
