// @vitest-environment node
import { describe, expect, it, vi } from "vitest"

import type { ChatEvent } from "@/lib/sandworm/chat"
import { createSandwormClient, SandwormError } from "@/lib/sandworm/client"

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
const stream = (...frames: string[]) => new Response(frames.join(""), { status: 200, headers: { "Content-Type": "text/event-stream" } })
const word = (text: string) => `event: content_block_delta\ndata: ${JSON.stringify({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text } })}\n\n`

const clientWith = (send: typeof fetch) => createSandwormClient({ baseUrl: "https://api.example.com/api", token: "secret", fetch: send })

describe("Sandworm's workspace model", () => {
  it("is the one its chat is asked to use", async () => {
    const send = vi.fn().mockResolvedValue(json({ data: { getWorkspace: { assistantModel: "a-model" } } }))
    expect(await clientWith(send).assistantModel("ws")).toBe("a-model")
  })

  it("says so when the workspace has none chosen", async () => {
    const send = vi.fn().mockResolvedValue(json({ data: { getWorkspace: { assistantModel: "" } } }))
    await expect(clientWith(send).assistantModel("ws")).rejects.toThrow(/no AI model/)
  })
})

describe("opening Sandworm's chat on a notebook", () => {
  it("makes the chat with its first message and reads that message's id", async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce(json({ data: { createChat: { id: "chat-1" } } }))
      .mockResolvedValueOnce(json({ data: { chatMessages: [{ id: "m-1", role: "user" }] } }))

    const opened = await clientWith(send).startChat("ws", "doc", "Do the research", "a-model", [{ id: "b1", title: "Brief", type: "markdown" }])

    expect(opened).toEqual({ chatId: "chat-1", messageId: "m-1" })
    const [, init] = send.mock.calls[0] ?? []
    expect((JSON.parse(init.body) as { variables: { input: unknown } }).variables.input).toEqual({
      workspaceId: "ws",
      documentId: "doc",
      message: "Do the research",
      model: "a-model",
      focusedBlocks: [{ id: "b1", title: "Brief", type: "markdown" }],
    })
    // As the person: their Sandworm login goes with every call
    expect(init.headers.Cookie).toBe("access_token=secret")
  })

  it("says so when the chat didn't keep the message", async () => {
    const send = vi.fn().mockResolvedValueOnce(json({ data: { createChat: { id: "c" } } })).mockResolvedValueOnce(json({ data: { chatMessages: [] } }))
    await expect(clientWith(send).startChat("ws", "doc", "x", "m")).rejects.toBeInstanceOf(SandwormError)
  })
})

describe("the agent's answer", () => {
  it("is read from the chat's stream, as the person", async () => {
    const send = vi.fn().mockResolvedValue(stream(word("Hello "), word("there"), "data: [DONE]\n\n"))
    const events: ChatEvent[] = []

    await clientWith(send).streamAnswer("chat-1", "m-1", (event) => events.push(event))

    expect(events).toEqual([{ type: "text", text: "Hello " }, { type: "text", text: "there" }])
    const [url, init] = send.mock.calls[0] ?? []
    expect(url).toBe("https://api.example.com/api/chat/chat-1/m-1/stream?after=0")
    expect(init.method).toBe("POST")
    expect(init.headers.Cookie).toBe("access_token=secret")
  })

  it("is carried on from where it got to when the connection drops, with nothing missed or said twice", async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce(stream(word("One "), word("two ")))
      .mockResolvedValueOnce(stream(word("three"), "data: [DONE]\n\n"))
    const events: ChatEvent[] = []

    await clientWith(send).streamAnswer("c", "m", (event) => events.push(event))

    expect(events.map((event) => (event.type === "text" ? event.text : "")).join("")).toBe("One two three")
    expect(String(send.mock.calls[1]?.[0])).toContain("after=2")
  })

  it("is tried again when the server is restarting", async () => {
    const send = vi.fn().mockResolvedValueOnce(new Response("", { status: 502 })).mockResolvedValueOnce(stream(word("ok"), "data: [DONE]\n\n"))
    const events: ChatEvent[] = []
    await clientWith(send).streamAnswer("c", "m", (event) => events.push(event))
    expect(events).toHaveLength(1)
  })

  it("says the person was signed out", async () => {
    const send = vi.fn().mockResolvedValue(new Response("", { status: 401 }))
    await expect(clientWith(send).streamAnswer("c", "m", () => {})).rejects.toThrow("signed you out")
  })

  it("is refused plainly when the chat says no", async () => {
    const send = vi.fn().mockResolvedValue(new Response("", { status: 404 }))
    await expect(clientWith(send).streamAnswer("c", "m", () => {})).rejects.toThrow("answered 404")
  })
})

describe("what the notebook printed", () => {
  it("waits for what is still running, then reads every cell", async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce(json({ status: "running", cells: [] }))
      .mockResolvedValueOnce(json({ status: "finished", cells: [{ id: "x", state: "success", outputs: [{ type: "stdout", text: "hi" }] }] }))

    const cells = await clientWith(send).results("ws", "doc")

    expect(cells).toHaveLength(1)
    expect(String(send.mock.calls[0]?.[0])).toContain("/workspaces/ws/documents/doc/run?waitSeconds=")
    expect(send.mock.calls[0]?.[1].method).toBe("GET")
  })

  it("says so when it never finishes", async () => {
    // A fresh response each time: a response body can be read only once
    const send = vi.fn().mockImplementation(async () => json({ status: "running", cells: [] }))
    await expect(clientWith(send).results("ws", "doc", 2)).rejects.toThrow("taking too long")
  })
})
