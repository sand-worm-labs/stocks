"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type { ChatMessage, ServerEvent } from "@/lib/chat/protocol"

// connecting: opening; live: in the room; offline: dropped, and trying again; unavailable: no chat server is set up for this site
export type ChatStatus = "connecting" | "live" | "offline" | "unavailable"

const RETRY_MS = [1000, 2000, 5000, 10_000]

// Being in a token's room: what has been said, who is there, and a way to say something. The connection is opened with a minute's pass
// from the app and opened again, with a new one, whenever it drops.
export function useChatRoom(room: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [online, setOnline] = useState(0)
  const [meId, setMeId] = useState<string>()
  const [status, setStatus] = useState<ChatStatus>("connecting")
  const [notice, setNotice] = useState<string>()
  const socket = useRef<WebSocket>(undefined)

  useEffect(() => {
    let stopped = false
    let attempt = 0
    let retry: ReturnType<typeof setTimeout>

    const again = () => {
      setStatus("offline")
      retry = setTimeout(open, RETRY_MS[Math.min(attempt++, RETRY_MS.length - 1)])
    }

    async function open() {
      const answer = await fetch("/api/chat/ticket", { cache: "no-store" }).catch(() => undefined)
      if (stopped) return
      if (!answer?.ok) return again()
      const { ticket, url } = (await answer.json()) as { ticket: string; url?: string }
      if (!url) return setStatus("unavailable")

      const address = new URL(url)
      address.searchParams.set("room", room.toLowerCase())
      address.searchParams.set("ticket", ticket)
      const connection = new WebSocket(address)
      socket.current = connection

      connection.onmessage = ({ data }) => {
        const event = JSON.parse(String(data)) as ServerEvent
        if (event.type === "hello") {
          attempt = 0
          setMeId(event.me.id)
          setMessages(event.history)
          setOnline(event.online)
          setStatus("live")
        } else if (event.type === "message") setMessages((current) => [...current, event.message])
        else if (event.type === "online") setOnline(event.count)
        else setNotice(event.reason)
      }
      connection.onclose = () => {
        if (!stopped) again()
      }
    }

    void open()
    return () => {
      stopped = true
      clearTimeout(retry)
      socket.current?.close()
    }
  }, [room])

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(undefined), 3000)
    return () => clearTimeout(timer)
  }, [notice])

  const say = useCallback((text: string) => {
    if (socket.current?.readyState !== WebSocket.OPEN) return false
    socket.current.send(JSON.stringify({ type: "say", text }))
    return true
  }, [])

  return { messages, online, meId, status, notice, say }
}
