// Sets environment variables for one test and puts them back after, as the web app's test runner does
const before = new Map<string, string | undefined>()

export function stubEnv(name: string, value: string) {
  if (!before.has(name)) before.set(name, process.env[name])
  process.env[name] = value
}

export function unstubAllEnvs() {
  for (const [name, value] of before) {
    if (value === undefined) delete process.env[name]
    else process.env[name] = value
  }
  before.clear()
}
