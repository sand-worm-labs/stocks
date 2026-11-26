import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

const FEATURES = join(import.meta.dirname, "../../../api/src/features")
// A controller people and agents call is one the web app's service key doesn't guard
const FOR_PEOPLE = /^@(ForPeople|ForTheApp|Public)\(\)/m
const PREFIX = /@Controller\('([^']*)'\)/
const ROUTE = /@(Get|Post|Put|Patch|Delete)\((?:'([^']*)')?\)/g

function controllerFiles(folder: string): string[] {
  return readdirSync(folder).flatMap((name) => {
    const full = join(folder, name)
    if (statSync(full).isDirectory()) return controllerFiles(full)
    return name.endsWith(".controller.ts") ? [full] : []
  })
}

// Every call the API has for people, read from its controllers, as "POST /strategies/:id/trade"
export function appCalls() {
  return controllerFiles(FEATURES).flatMap((file) => {
    const source = readFileSync(file, "utf8")
    if (!FOR_PEOPLE.test(source)) return []
    const prefix = PREFIX.exec(source)?.[1] ?? ""
    return [...source.matchAll(ROUTE)].map(([, method = "", path]) => `${method.toUpperCase()} /${[prefix, path].filter(Boolean).join("/")}`)
  })
}
