"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { PiPaperPlaneTilt } from "react-icons/pi"

import { buttonVariants } from "@/components/Button/Button"
import { useLiveMarketContext } from "@/components/Markets/LiveMarket"
import { Card } from "@/components/ui/card"
import { formatUsd, shortenAddress } from "@/lib/format"
import { cn } from "@/lib/utils"

type Message = { id: string; at: number; author: string; text: string; side?: "buy" | "sell" }

const STORAGE_KEY = (address: string) => `sandworm-stocks:chat:${address}`
const MAX_LENGTH = 280

const clock = (at: number) => new Date(at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })

function readMessages(address: string): Message[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY(address)) ?? "[]") as Message[]
  } catch {
    return []
  }
}

// A room for the token. What people write sits between the trades as they land on Base, so it is never an empty room.
export function TokenChat({ address, symbol }: { address: string; symbol: string }) {
  const { trades } = useLiveMarketContext()
  const [written, setWritten] = useState<Message[]>([])
  const [draft, setDraft] = useState("")
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setWritten(readMessages(address))
  }, [address])

  const feed = useMemo(() => {
    const own = trades
      .filter(({ token }) => token === address.toLowerCase())
      .map<Message>(({ at, side, usd, price }, i) => ({
        id: `trade-${at}-${i}`,
        at,
        author: "Base",
        side,
        text: `${side === "buy" ? "Bought" : "Sold"} ${usd === undefined ? "" : formatUsd(usd)}${price === undefined ? "" : ` at ${formatUsd(price)}`}`,
      }))

    return [...written, ...own].sort((a, b) => a.at - b.at)
  }, [trades, written, address])

  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [feed.length])

  const send = () => {
    const text = draft.trim()
    if (!text) return

    const next = [...written, { id: `me-${Date.now()}`, at: Date.now(), author: "You", text }]
    setWritten(next)
    setDraft("")
    try {
      localStorage.setItem(STORAGE_KEY(address), JSON.stringify(next))
    } catch {
      // Without storage the message stays on the page until it is closed
    }
  }

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="border-border-secondary dark:border-border-tertiary flex items-baseline justify-between gap-3 border-b px-4 py-3 md:px-6">
        <h2 className="text-lg font-medium">{symbol} chat</h2>
        <span className="text-ink-400 text-xs">What you write stays in this browser until chat is connected</span>
      </div>

      <ul
        className="flex h-96 flex-col gap-3 overflow-y-auto px-4 py-4 md:px-6"
        aria-label="Messages"
        aria-live="polite"
      >
        {feed.length === 0 && (
          <li className="text-ink-400 text-sm">Nothing yet. Say something, or wait for the next trade.</li>
        )}
        {feed.map(({ id, at, author, text, side }) => (
          <li
            key={id}
            className={cn(
              "animate-slide-in flex flex-col gap-0.5 text-sm",
              author === "You" ? "items-end" : "items-start"
            )}
          >
            <span className="text-ink-400 flex items-center gap-2 text-xs">
              {author === "Base" ? "Trade on Base" : author}
              <span className="tabular-nums">{clock(at)}</span>
            </span>
            <span
              className={cn(
                "max-w-[85%] rounded-2xl px-3 py-2",
                author === "You" && "bg-base-400 text-primary-foreground dark:bg-white dark:text-black",
                author !== "You" && !side && "bg-inputBg dark:bg-white/10",
                side === "buy" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                side === "sell" && "bg-red-500/10 text-red-700 dark:text-red-400"
              )}
            >
              {text}
            </span>
          </li>
        ))}
        <div ref={end} />
      </ul>

      <form
        className="border-border-secondary dark:border-border-tertiary flex items-center gap-2 border-t p-3"
        onSubmit={(event) => {
          event.preventDefault()
          send()
        }}
      >
        <input
          value={draft}
          maxLength={MAX_LENGTH}
          onChange={(event) => setDraft(event.target.value)}
          aria-label={`Message about ${symbol}`}
          placeholder={`Say something about ${symbol}...`}
          className="bg-inputBg placeholder:text-ink-400 focus:ring-primary h-10 min-w-0 flex-1 rounded-full px-4 text-sm outline-none focus:ring dark:bg-white/10"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label="Send"
          className={buttonVariants({
            intent: "dark",
            size: "compact",
            className: "min-h-0 rounded-full p-2.5 disabled:opacity-40",
          })}
        >
          <PiPaperPlaneTilt size={18} />
        </button>
      </form>
      <span className="sr-only">{shortenAddress(address)}</span>
    </Card>
  )
}
