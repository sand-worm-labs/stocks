import { ResearchFailure } from "@/lib/research/failure"
import { SANDWORM_WEB_URL } from "@/lib/research/result"

export class SandwormError extends ResearchFailure {}

export type NotebookCell = { type: "python" | "markdown"; title: string; content: string }
export type RunOutput = { type: string; text?: string }
export type RunCell = { id: string; state: string; outputs?: RunOutput[]; error?: string }
type RunReport = { status: "running" | "idle" | "finished"; cells: RunCell[] }

type Options = {
  // The main Sandworm API, with its /api prefix (`SANDWORM_API_URL`)
  baseUrl: string
  // The person's access token on Sandworm: the work is done as them, in their workspace
  token: string
  fetch?: typeof fetch
}

const TIMEOUT_MS = 60_000
// A run is waited on in turns of this many seconds, as the API answers when a turn ends
const WAIT_SECONDS = 45

// Sandworm's own API, as one person, for what Stocks needs: make a notebook, put cells in it, run it, read what it printed. These are the
// calls Sandworm's MCP server makes for an agent (apps/mcp/src/tools/notebooks), so the notebooks come out the same.
export function createSandwormClient({ baseUrl, token, fetch: send = fetch }: Options) {
  const root = baseUrl.replace(/\/$/, "")

  async function call<T>(method: string, path: string, body?: unknown, timeoutMs = TIMEOUT_MS): Promise<T> {
    const reply = await send(`${root}${path}`, {
      method,
      headers: { Cookie: `access_token=${token}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (reply.status === 401) throw new SandwormError("Sandworm has signed you out. Sign in again")
    const json = (await reply.json().catch(() => null)) as T | null
    if (!reply.ok || json === null) throw new SandwormError(`Sandworm answered ${reply.status} to ${method} ${path}`)
    return json
  }

  async function graphql<T>(query: string, variables: Record<string, unknown> = {}) {
    const { data, errors } = await call<{ data?: T; errors?: { message: string }[] }>("POST", "/graphql", { query, variables })
    if (errors?.length || !data) throw new SandwormError(errors?.map(({ message }) => message).join("; ") ?? "Sandworm sent nothing back")
    return data
  }

  const documentPath = (workspaceId: string, id: string) => `/workspaces/${workspaceId}/documents/${id}`

  return {
    // The workspace they were last in, which is where their notebooks go unless they say otherwise
    async workspaceId() {
      const { getUserWorkspaceInfo } = await graphql<{ getUserWorkspaceInfo: { id: string } }>(
        "query { getUserWorkspaceInfo { id } }"
      )
      return getUserWorkspaceInfo.id
    },

    // A cloud notebook, the kind that can be run from here
    async createNotebook(workspaceId: string, title: string) {
      const { createDocument } = await graphql<{ createDocument: { id: string } }>(
        `mutation ($workspaceId: String!, $input: CreateDocumentInput!) {
          createDocument(workspaceId: $workspaceId, input: $input) { id }
        }`,
        { workspaceId, input: { title, version: 2, orderIndex: 0, runtime: "CLOUD" } }
      )
      // The editor shows the title from the collaborative document, not the database row
      await call("PUT", `${documentPath(workspaceId, createDocument.id)}/title`, { title })
      return { id: createDocument.id, url: `${SANDWORM_WEB_URL()}/workspace/${workspaceId}/documents/${createDocument.id}/notebook/edit` }
    },

    async addCells(workspaceId: string, notebookId: string, cells: NotebookCell[]) {
      const { blocks } = await call<{ blocks: { id: string; kind: string }[] }>(
        "POST",
        `${documentPath(workspaceId, notebookId)}/blocks`,
        { blocks: cells.map(({ type, title, content }) => ({ kind: type, title, source: content })) }
      )
      return blocks
    },

    // Runs the given cells and waits for them, turn by turn, until they are done or `turns` run out
    async run(workspaceId: string, notebookId: string, cellIds: string[], turns = 4) {
      const path = `${documentPath(workspaceId, notebookId)}/run`
      let report = await call<RunReport>("POST", path, { blockIds: cellIds, waitSeconds: WAIT_SECONDS }, (WAIT_SECONDS + 15) * 1000)
      for (let turn = 1; report.status === "running" && turn < turns; turn++)
        report = await call<RunReport>("GET", `${path}?waitSeconds=${WAIT_SECONDS}`, undefined, (WAIT_SECONDS + 15) * 1000)
      if (report.status === "running") throw new SandwormError("The notebook is taking too long to run")
      return report.cells
    },
  }
}

export type SandwormClient = ReturnType<typeof createSandwormClient>
