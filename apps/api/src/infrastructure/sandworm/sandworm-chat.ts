// What Sandworm's chat streams while its agent works in a notebook (apps/api/src/features/chat/types/stream.types.ts), as much of it as Stocks
// reads: the words the agent writes, and which cells it is making and running.
export type ChatEvent =
  | { type: "message_start" }
  | { type: "text"; text: string }
  | { type: "action"; state: "making" | "ran"; title: string }
  | { type: "error"; message: string }

type Wire = {
  type?: string
  content_block?: { type?: string; text?: string; block_title?: string }
  delta?: { type?: string; text?: string; block_title?: string }
  error?: { message?: string }
}

// One streamed event of the chat's own, as an event of ours. Anything Stocks has no use for (the agent's thinking, a block ending) is nothing.
export function readEvent(json: string): ChatEvent | undefined {
  let wire: Wire
  try {
    wire = JSON.parse(json) as Wire
  } catch {
    return undefined
  }
  if (wire.type === "message_start") return { type: "message_start" }
  if (wire.type === "error") return { type: "error", message: wire.error?.message ?? "Sandworm's agent stopped" }
  if (wire.type === "content_block_start" && wire.content_block?.type === "block_action")
    return { type: "action", state: "making", title: wire.content_block.block_title ?? "a cell" }
  if (wire.type === "content_block_start" && wire.content_block?.type === "text" && wire.content_block.text)
    return { type: "text", text: wire.content_block.text }
  if (wire.type === "content_block_delta" && wire.delta?.type === "text_delta" && wire.delta.text) return { type: "text", text: wire.delta.text }
  if (wire.type === "content_block_delta" && wire.delta?.type === "block_action_delta")
    return { type: "action", state: "ran", title: wire.delta.block_title ?? "a cell" }
  return undefined
}

export type StreamRead = {
  // The server said the answer is over (done, or failed)
  isOver: boolean
  // Events of the answer taken in, which is where a connection that dropped carries on from
  received: number
}

// Reads one connection of the chat's server-sent events. A line is "event: name" or "data: payload"; "[DONE]" and "[ERROR]" end the answer, and a
// "turn" event says only that a job is running, so it is not part of the answer. Each event of the answer is handed on as it arrives.
export async function readStream(body: ReadableStream<Uint8Array>, onEvent: (event: ChatEvent) => void): Promise<StreamRead> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let name = "message_start"
  let received = 0
  let isOver = false

  const take = (line: string) => {
    if (line.startsWith("event: ")) {
      name = line.slice(7).trim()
      return
    }
    if (!line.startsWith("data: ")) return
    const data = line.slice(6)
    const trimmed = data.trimEnd()
    if (trimmed === "[DONE]" || trimmed === "[ERROR]") {
      isOver = true
      return
    }
    if (!trimmed || name === "turn") return

    received += 1
    // Plain text arrives word by word as "token" events, with the space between words kept on the end of each
    if (name === "token") return onEvent({ type: "text", text: data })
    const event = readEvent(trimmed)
    if (event) onEvent(event)
  }

  while (!isOver) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""
    for (const line of lines) {
      if (isOver) break
      take(line)
    }
  }
  await reader.cancel().catch(() => undefined)
  return { isOver, received }
}

// What the agent has said and done so far, kept as it streams in
export type Answer = { text: string; actions: { title: string; state: "making" | "ran" }[]; error?: string }

export const emptyAnswer = (): Answer => ({ text: "", actions: [] })

export function addToAnswer(answer: Answer, event: ChatEvent): Answer {
  if (event.type === "text") return { ...answer, text: answer.text + event.text }
  if (event.type === "error") return { ...answer, error: event.message }
  if (event.type !== "action") return answer

  const others = answer.actions.filter(({ title }) => title !== event.title)
  return { ...answer, actions: [...others, { title: event.title, state: event.state }] }
}

// The last thing the agent said, in a line: what a person watching the run sees beside the step that is going
export function latestSaid(answer: Answer, longest = 140) {
  const lines = answer.text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
  const last = lines.at(-1) ?? ""
  return last.length > longest ? `${last.slice(0, longest - 1)}…` : last
}
