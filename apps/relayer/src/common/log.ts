export function log(message: string): void {
  const time = new Date().toISOString().slice(11, 19)
  console.log(`${time} ${message}`)
}

// Long enough to say what went wrong, short enough for one log line
export function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.slice(0, 300)
}
