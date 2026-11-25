// What went wrong, in words an agent can act on, and whether the app said it (a refusal) or it is ours (the app couldn't be reached)
export class WebError extends Error {}

export type Web = {
  get(path: string): Promise<unknown>
  post(path: string, body?: unknown): Promise<unknown>
  patch(path: string, body: unknown): Promise<unknown>
}

// The Sandworm Stocks app, called as the agent's person. The agent's own token goes on to the app untouched: the app decides who it is for
// and what it may do, so nothing here is a second set of rules that could disagree with the app's.
export function createWeb(baseUrl: string, token: string, fetchImpl: typeof fetch = fetch): Web {
  async function call(method: string, path: string, body?: unknown) {
    let response: Response
    try {
      response = await fetchImpl(new URL(path, baseUrl), {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch {
      throw new WebError("The Sandworm Stocks app could not be reached")
    }

    const answer = (await response.json().catch(() => undefined)) as { error?: string } | undefined
    if (!response.ok) throw new WebError(answer?.error ?? `The app answered ${response.status}`)
    return answer
  }

  return {
    get: (path) => call("GET", path),
    post: (path, body) => call("POST", path, body ?? {}),
    patch: (path, body) => call("PATCH", path, body),
  }
}
