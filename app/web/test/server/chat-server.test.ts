// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { WebSocket } from "ws"
import type { AddressInfo } from "node:net"

import { signChatTicket } from "@/lib/auth/token"
import type { ServerEvent } from "@/lib/chat/protocol"

import { createRealtimeServer } from "@/server/realtime-server"

const ROOM = `0x${"a".repeat(40)}`
let server: ReturnType<typeof createRealtimeServer>
let port = 0

beforeAll(async () => {
  process.env.AUTH_SECRET = "a-test-secret-that-is-long-enough-to-use"
  server = createRealtimeServer(0)
  await new Promise((resolve) => server.once("listening", resolve))
  port = (server.address() as AddressInfo).port
})
afterAll(() => server.close())

async function join(user: string, { room = ROOM, ticket }: { room?: string; ticket?: string } = {}) {
  const socket = new WebSocket(`ws://localhost:${port}/?room=${room}&ticket=${ticket ?? (await signChatTicket(user))}`)
  const heard: ServerEvent[] = []
  socket.on("message", (data) => heard.push(JSON.parse(String(data)) as ServerEvent))
  const closed = new Promise<number>((resolve) => socket.on("close", resolve))
  const next = <T extends ServerEvent["type"]>(type: T, after = 0) =>
    new Promise<Extract<ServerEvent, { type: T }>>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`No ${type} came`)), 2000)
      const look = () => {
        const found = heard.slice(after).find((event) => event.type === type)
        if (found) {
          clearTimeout(timer)
          resolve(found as Extract<ServerEvent, { type: T }>)
        } else setTimeout(look, 10)
      }
      look()
    })
  await new Promise((resolve) => socket.once("open", resolve))
  return { socket, heard, next, closed, say: (text: string) => socket.send(JSON.stringify({ type: "say", text })) }
}

describe("chat server", () => {
  it("passes what one person says to everyone in the room, and remembers it for the next to come", async () => {
    const ann = await join("ann")
    await ann.next("hello")
    const bob = await join("bob")
    expect((await bob.next("hello")).history).toEqual([])

    ann.say("  gm   everyone ")
    const heard = await bob.next("message")
    expect(heard.message).toMatchObject({ text: "gm everyone", userId: "ann" })
    expect((await ann.next("message")).message.id).toBe(heard.message.id)

    const late = await join("cat")
    expect((await late.next("hello")).history.map(({ text }) => text)).toEqual(["gm everyone"])
    for (const one of [ann, bob, late]) one.socket.close()
  })

  it("counts people in the room, not tabs", async () => {
    const first = await join("dan")
    const second = await join("dan")
    const other = await join("eve")
    expect((await other.next("hello")).online).toBe(2)
    for (const one of [first, second, other]) one.socket.close()
  })

  it("keeps rooms apart", async () => {
    const here = await join("fay")
    const there = await join("gus", { room: `0x${"b".repeat(40)}` })
    await there.next("hello")
    here.say("only here")
    await here.next("message")
    expect(there.heard.some(({ type }) => type === "message")).toBe(false)
    here.socket.close()
    there.socket.close()
  })

  it("turns away a connection with no ticket, a made-up one, or no room", async () => {
    expect(await (await join("x", { ticket: "nope" })).closed).toBe(4401)
    expect(await (await join("x", { room: "everywhere" })).closed).toBe(4400)
  })

  it("ignores what isn't a message, and slows down someone who sends too fast", async () => {
    const hal = await join("hal")
    await hal.next("hello")
    hal.socket.send("not json")
    hal.socket.send(JSON.stringify({ type: "say", text: "   " }))
    hal.say("one")
    hal.say("two")
    expect((await hal.next("error")).reason).toMatch(/too fast/)
    expect(hal.heard.filter(({ type }) => type === "message")).toHaveLength(1)
    hal.socket.close()
  })
})
