"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { PiChatCenteredText } from "react-icons/pi"

import { BaseMark } from "@/components/BaseMark/BaseMark"
import { useLiveMarketContext } from "@/components/Markets/LiveMarket"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { type ChatStatus, useChatRoom } from "@/hooks/use-chat-room"
import type { ChatMessage } from "@/lib/chat/protocol"
import { formatTime } from "@/lib/dates"
import { formatUsd } from "@/lib/format"
import type { Swap } from "@/lib/markets/swaps"
import { cn } from "@/lib/utils"

import { ChatComposer } from "./ChatComposer"

type Item = { kind: "message"; at: number; message: ChatMessage } | { kind: "trade"; at: number; swap: Swap }

const ALERTS_KEY = "sandworm-stocks:chat:trade-alerts"

const clock = (at: number) => formatTime(new Date(at).toISOString())

const STATUS_TEXT: Record<Exclude<ChatStatus, "live">, string> = {
  connecting: "Connecting…",
  offline: "Reconnecting…",
  unavailable: "Chat isn't connected",
}

// A trade as it lands on Base, in the same bubble as what people say, on the left. A bar down its edge says which way it went, green for a
// buy and red for a sell, and the Base mark and time sit above the first of a run of trades.
function TradeBubble({ swap, first }: { swap: Swap; first: boolean }) {
  return (
    <li className="animate-slide-in flex flex-col items-start gap-1 pr-10">
      {first && (
        <span className="text-ink-400 flex items-center gap-1.5 px-1 text-xs">
          <span role="img" aria-label="Trade on Base" className="flex">
            <BaseMark size={14} />
          </span>
          <time dateTime={new Date(swap.at).toISOString()} className="tabular-nums">
            {clock(swap.at)}
          </time>
        </span>
      )}
      <p className="border-hover-border dark:border-border-tertiary bg-block-surface relative w-fit max-w-full overflow-hidden rounded-2xl rounded-bl-sm border py-2.5 pr-4 pl-5 text-[13px] leading-relaxed">
        <span
          aria-hidden="true"
          className={cn("absolute inset-y-0 left-0 w-1", swap.side === "buy" ? "bg-success" : "bg-error")}
        />
        {swap.side === "buy" ? "Bought" : "Sold"} {swap.usd === undefined ? "" : formatUsd(swap.usd)}
        {swap.price === undefined ? "" : ` at ${formatUsd(swap.price)}`}
      </p>
    </li>
  )
}

// What a person said. Your own are on the right in the bubble the agent chat gives what you write; everyone else's are on the left, in
// the bubble it gives its answers. A name and time sit above the first of a run from one person.
function Bubble({ message, mine, first }: { message: ChatMessage; mine: boolean; first: boolean }) {
  return (
    <li className={cn("animate-slide-in flex flex-col gap-1", mine ? "items-end pl-10" : "items-start pr-10")}>
      {first && (
        <span className="text-ink-400 flex items-center gap-2 px-1 text-xs">
          <span className="text-ink-100 font-medium">{mine ? "You" : message.name}</span>
          <time dateTime={new Date(message.at).toISOString()} className="tabular-nums">
            {clock(message.at)}
          </time>
        </span>
      )}
      <p
        className={cn(
          "w-fit max-w-full px-4 py-2.5 text-[13px] leading-relaxed break-words whitespace-pre-wrap",
          mine
            ? "bg-hover-bg border-hover-border dark:border-border-tertiary rounded-2xl rounded-br-sm border dark:bg-white/5"
            : "border-hover-border dark:border-border-tertiary bg-block-surface rounded-2xl rounded-bl-sm border"
        )}
      >
        {message.text}
      </p>
    </li>
  )
}

// A room for the token. What people write is passed on to everyone there as it is written, over a websocket, and the trades as they land
// on Base can be shown between the messages or left out.
export function TokenChat({ address, symbol }: { address: string; symbol: string }) {
  const { trades } = useLiveMarketContext()
  const { messages, online, meId, status, notice, say } = useChatRoom(address)
  const [alerts, setAlerts] = useState(true)
  const list = useRef<HTMLUListElement>(null)
  // Whether the list is at the bottom, so a new line follows it down and doesn't pull someone away from what they are reading
  const atBottom = useRef(true)

  useEffect(() => {
    setAlerts(localStorage.getItem(ALERTS_KEY) !== "off")
  }, [])

  const items = useMemo<Item[]>(() => {
    const said = messages.map<Item>((message) => ({ kind: "message", at: message.at, message }))
    const traded = alerts
      ? trades
          .filter(({ token }) => token === address.toLowerCase())
          .map<Item>((swap) => ({ kind: "trade", at: swap.at, swap }))
      : []
    return [...said, ...traded].sort((a, b) => a.at - b.at)
  }, [messages, trades, alerts, address])

  useEffect(() => {
    const element = list.current
    if (!element || !atBottom.current) return
    element.scrollTo({ top: element.scrollHeight, behavior: "smooth" })
  }, [items.length])

  const toggleAlerts = (on: boolean) => {
    setAlerts(on)
    localStorage.setItem(ALERTS_KEY, on ? "on" : "off")
  }

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="border-border-secondary dark:border-border-tertiary flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-3 md:px-6">
        <div>
          <h2 className="flex items-center gap-x-1.5 text-base leading-6 font-medium">
            <PiChatCenteredText size={18} aria-hidden="true" className="flex-none" />
            {symbol} chat
          </h2>
          <p className="text-ink-400 flex items-center gap-1.5 text-[12.5px]">
            <span
              aria-hidden="true"
              className={cn("size-1.5 rounded-full", status === "live" ? "bg-success" : "bg-ink-400/50")}
            />
            {status === "live" ? `${online} online` : STATUS_TEXT[status]}
          </p>
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          Trade alerts
          <Switch checked={alerts} onCheckedChange={toggleAlerts} aria-label="Show trades in the chat" />
        </label>
      </div>

      <ul
        ref={list}
        onScroll={({ currentTarget: { scrollTop, clientHeight, scrollHeight } }) => {
          atBottom.current = scrollHeight - scrollTop - clientHeight < 80
        }}
        aria-label="Messages"
        aria-live="polite"
        className="flex h-96 flex-col gap-2 overflow-y-auto px-4 py-4 md:px-6"
      >
        {items.length === 0 && (
          <li className="text-ink-400 flex flex-1 flex-col items-center justify-center gap-1 text-center text-sm">
            <span className="text-ink-100 font-medium">No messages yet</span>
            <span>Say something about {symbol}.</span>
          </li>
        )}
        {items.map((item, i) => {
          const before = items[i - 1]
          if (item.kind === "trade")
            return <TradeBubble key={item.swap.id} swap={item.swap} first={before?.kind !== "trade"} />
          const first = before?.kind !== "message" || before.message.userId !== item.message.userId
          return (
            <Bubble key={item.message.id} message={item.message} mine={item.message.userId === meId} first={first} />
          )
        })}
      </ul>

      <div className="border-border-secondary dark:border-border-tertiary border-t p-3">
        <ChatComposer
          symbol={symbol}
          disabled={status !== "live"}
          placeholder={status === "live" ? `Say something about ${symbol}...` : STATUS_TEXT[status]}
          onSend={say}
        />
        {notice && (
          <p role="status" className="text-error mt-1.5 text-xs">
            {notice}
          </p>
        )}
      </div>
    </Card>
  )
}
