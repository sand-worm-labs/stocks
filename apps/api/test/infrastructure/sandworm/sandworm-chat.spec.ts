
import { addToAnswer, type ChatEvent, emptyAnswer, latestSaid, readEvent, readStream } from "@/infrastructure/sandworm/sandworm-chat"

const body = (chunks: string[]) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk))
      controller.close()
    },
  })

const sse = (event: string, data: unknown) => `event: ${event}\ndata: ${typeof data === "string" ? data : JSON.stringify(data)}\n\n`

async function eventsOf(chunks: string[]) {
  const events: ChatEvent[] = []
  const read = await readStream(body(chunks), (event) => events.push(event))
  return { events, read }
}

describe("an event of the chat", () => {
  it("is the words the agent writes", () => {
    expect(readEvent(JSON.stringify({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Testing " } }))).toEqual({ type: "text", text: "Testing " })
  })

  it("is a cell being made, and then run", () => {
    const making = { type: "content_block_start", index: 1, content_block: { type: "block_action", action: "generating", block_id: "b", block_type: "python", block_title: "Backtest" } }
    const ran = { type: "content_block_delta", index: 1, delta: { type: "block_action_delta", action: "ran", block_id: "b", block_type: "python", block_title: "Backtest" } }
    expect(readEvent(JSON.stringify(making))).toEqual({ type: "action", state: "making", title: "Backtest" })
    expect(readEvent(JSON.stringify(ran))).toEqual({ type: "action", state: "ran", title: "Backtest" })
  })

  it("is a failure when the agent stops with one", () => {
    expect(readEvent(JSON.stringify({ type: "error", error: { type: "x", message: "Out of credit" } }))).toEqual({ type: "error", message: "Out of credit" })
  })

  it("is nothing for what Stocks has no use for", () => {
    expect(readEvent(JSON.stringify({ type: "content_block_start", index: 0, content_block: { type: "thinking", thinking: "" } }))).toBeUndefined()
    expect(readEvent(JSON.stringify({ type: "content_block_stop", index: 0 }))).toBeUndefined()
    expect(readEvent("not json")).toBeUndefined()
  })
})

describe("reading the chat's stream", () => {
  it("hands on each event as it arrives, and stops at [DONE]", async () => {
    const { events, read } = await eventsOf([
      sse("message_start", { type: "message_start", message: { id: "m", chat_id: "c" } }),
      sse("content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Hello" } }),
      "data: [DONE]\n\n",
      sse("content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "never read" } }),
    ])
    expect(events).toEqual([{ type: "message_start" }, { type: "text", text: "Hello" }])
    expect(read).toEqual({ isOver: true, received: 2 })
  })

  it("puts together a line that arrives in pieces", async () => {
    const line = sse("content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "split" } })
    const { events } = await eventsOf([line.slice(0, 20), line.slice(20)])
    expect(events).toEqual([{ type: "text", text: "split" }])
  })

  it("keeps the space on the end of a word that arrives as a token", async () => {
    const { events } = await eventsOf(["event: token\ndata: word \n\n", "event: token\ndata: next\n\n"])
    expect(events).toEqual([{ type: "text", text: "word " }, { type: "text", text: "next" }])
  })

  it("doesn't count a 'job is running' notice as part of the answer", async () => {
    const { events, read } = await eventsOf(["event: turn\ndata: {\"active\":true}\n\n", sse("content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "x" } })])
    expect(events).toHaveLength(1)
    expect(read.received).toBe(1)
  })

  it("says the answer is not over when the connection just ends", async () => {
    const { read } = await eventsOf([sse("content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "x" } })])
    expect(read).toEqual({ isOver: false, received: 1 })
  })

  it("ends on [ERROR] too", async () => {
    const { read } = await eventsOf(["data: [ERROR]\n\n"])
    expect(read.isOver).toBe(true)
  })
})

describe("what the agent has said and done", () => {
  it("adds up its words, and a cell moves from being made to run", () => {
    let answer = emptyAnswer()
    answer = addToAnswer(answer, { type: "text", text: "Starting.\n" })
    answer = addToAnswer(answer, { type: "text", text: "Building the backtest" })
    answer = addToAnswer(answer, { type: "action", state: "making", title: "Backtest" })
    answer = addToAnswer(answer, { type: "action", state: "ran", title: "Backtest" })
    expect(answer.text).toBe("Starting.\nBuilding the backtest")
    expect(answer.actions).toEqual([{ title: "Backtest", state: "ran" }])
  })

  it("keeps a failure", () => {
    expect(addToAnswer(emptyAnswer(), { type: "error", message: "boom" }).error).toBe("boom")
  })

  it("says the last line of what it said, shortened", () => {
    expect(latestSaid({ text: "First.\n\nSecond line\n", actions: [] })).toBe("Second line")
    expect(latestSaid({ text: "x".repeat(300), actions: [] }, 20)).toHaveLength(20)
    expect(latestSaid(emptyAnswer())).toBe("")
  })
})
