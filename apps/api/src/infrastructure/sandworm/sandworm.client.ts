import { ResearchFailure } from "@/features/research/research-failure"
import { SANDWORM_WEB_URL } from "@/features/research/sandworm-link"

import { type ChatEvent, readStream } from "./sandworm-chat"

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
// How long the agent may work on one message before Stocks gives up on it
const CHAT_TIMEOUT_MS = 12 * 60_000
// A connection to the chat that drops is opened again from where it got to, this many times
const MOST_RECONNECTS = 5
export type FocusedCell = { id: string; title: string; type: string }
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

    // The model the person's workspace chats with, which is the one its chat is asked to use
    async assistantModel(workspaceId: string) {
      const { getWorkspace } = await graphql<{ getWorkspace: { assistantModel: string } }>(
        "query ($workspaceId: String!) { getWorkspace(workspaceId: $workspaceId) { assistantModel } }",
        { workspaceId }
      )
      if (!getWorkspace.assistantModel) throw new SandwormError("Your Sandworm workspace has no AI model chosen. Pick one in Sandworm, then try again")
      return getWorkspace.assistantModel
    },

    // Opens Sandworm's chat on a notebook with a first message, which is what sets its agent working in that notebook, as it does for a person
    // typing in the notebook's chat. `focused` are the cells the message is about.
    async startChat(workspaceId: string, notebookId: string, message: string, model: string, focused: FocusedCell[] = []) {
      const { createChat } = await graphql<{ createChat: { id: string } }>(
        `mutation ($input: CreateChatInput!) { createChat(input: $input) { id } }`,
        { input: { workspaceId, documentId: notebookId, message, model, ...(focused.length && { focusedBlocks: focused }) } }
      )
      const { chatMessages } = await graphql<{ chatMessages: { id: string; role: string }[] }>(
        "query ($chatId: String!) { chatMessages(chatId: $chatId) { id role } }",
        { chatId: createChat.id }
      )
      const first = chatMessages.find(({ role }) => role === "user")
      if (!first) throw new SandwormError("Sandworm's chat didn't keep the message")
      return { chatId: createChat.id, messageId: first.id }
    },

    // Another message in the same chat, which the agent answers in the same notebook
    async sendMessage(chatId: string, content: string, model: string) {
      const { sendMessage } = await graphql<{ sendMessage: { id: string } }>(
        `mutation ($input: SendMessageInput!) { sendMessage(input: $input) { id } }`,
        { input: { chatId, content, model } }
      )
      return { messageId: sendMessage.id }
    },

    // The agent's answer to a message, as it is written, until it says it is done. A connection that drops is opened again from where the
    // answer had got to, so nothing is missed or counted twice.
    async streamAnswer(chatId: string, messageId: string, onEvent: (event: ChatEvent) => void) {
      const signal = AbortSignal.timeout(CHAT_TIMEOUT_MS)
      let position = 0

      for (let failures = 0; failures <= MOST_RECONNECTS; failures++) {
        try {
          const reply = await send(`${root}/chat/${chatId}/${messageId}/stream?after=${position}`, {
            method: "POST",
            headers: { Cookie: `access_token=${token}`, Accept: "text/event-stream", "Cache-Control": "no-cache" },
            signal,
          })
          if (reply.status === 401) throw new SandwormError("Sandworm has signed you out. Sign in again")
          if (reply.status < 500 && !reply.ok) throw new SandwormError(`Sandworm's chat answered ${reply.status}`)
          if (reply.ok && reply.body) {
            const read = await readStream(reply.body, onEvent)
            position += read.received
            if (read.isOver) return
          }
        } catch (error) {
          if (error instanceof SandwormError) throw error
          if (signal.aborted) throw new SandwormError("Sandworm's agent is taking too long")
        }
        await new Promise((wait) => setTimeout(wait, 500 * (failures + 1)))
      }
      throw new SandwormError("Lost the connection to Sandworm's chat")
    },

    // What every cell of the notebook last printed, once nothing in it is still running: the agent ran its cells as it wrote them, so this reads
    // what they came to
    async results(workspaceId: string, notebookId: string, turns = 4) {
      const path = `${documentPath(workspaceId, notebookId)}/run?waitSeconds=${WAIT_SECONDS}`
      let report = await call<RunReport>("GET", path, undefined, (WAIT_SECONDS + 15) * 1000)
      for (let turn = 1; report.status === "running" && turn < turns; turn++)
        report = await call<RunReport>("GET", path, undefined, (WAIT_SECONDS + 15) * 1000)
      if (report.status === "running") throw new SandwormError("The notebook is taking too long to run")
      return report.cells
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
