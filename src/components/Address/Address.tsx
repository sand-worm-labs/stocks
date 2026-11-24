"use client"

import { type ReactNode, useEffect, useRef, useState } from "react"
import { PiCheck, PiCopy } from "react-icons/pi"

import { type AddressLength, formatAddress } from "@/lib/format"
import { cn } from "@/lib/utils"

// What an explorer calls each thing a value can be
type Kind = "address" | "token" | "tx"
const NOUN: Record<Kind, string> = { address: "address", token: "contract address", tx: "transaction hash" }

const EXPLORER = "https://basescan.org"
export const explorerUrl = (kind: Kind, value: string) => `${EXPLORER}/${kind}/${value}`

const COPIED_MS = 1500

type AddressProps = {
  value: string
  kind?: Kind
  // How much of it to show: the ends (short), more of it (long), or all of it
  length?: AddressLength
  // Where it links: the explorer's page for it unless told otherwise, such as a DefiLlama, CoinGecko or DexScreener page. `null` for
  // no link at all.
  href?: string | null
  // Something small before it, such as the logo of where it links
  icon?: ReactNode
  className?: string
}

// Every address, contract and transaction hash in the app: monospaced, linked to where it can be read about, and with a button to copy it
// whole, whatever length is shown. The one place that decides how they look, so they all behave the same.
export function Address({ value, kind = "address", length = "short", href, icon, className }: AddressProps) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const link = href === undefined ? explorerUrl(kind, value) : href

  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      // A browser that won't let a page write to the clipboard: select what is there so it can be copied by hand
      const field = document.createElement("textarea")
      field.value = value
      document.body.append(field)
      field.select()
      document.execCommand("copy")
      field.remove()
    }
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), COPIED_MS)
  }

  const text = (
    <span className={cn("font-body-mono", length === "full" && "break-all")}>{formatAddress(value, length)}</span>
  )

  return (
    <span data-slot="address" className={cn("inline-flex max-w-full items-center gap-1.5 align-middle", className)}>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          title={value}
          className="text-accent dark:text-primary inline-flex min-w-0 items-center gap-1.5 hover:underline"
        >
          {icon}
          {text}
        </a>
      ) : (
        <span title={value} className="inline-flex min-w-0 items-center gap-1.5">
          {icon}
          {text}
        </span>
      )}
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${NOUN[kind]}`}
        title={copied ? "Copied" : `Copy ${NOUN[kind]}`}
        className="text-ink-400 hover:text-ink-100 hover:bg-hover-bg focus-visible:ring-mark/50 flex size-5 flex-none items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-2 dark:hover:bg-white/10"
      >
        {copied ? (
          <PiCheck size={13} aria-hidden="true" className="text-emerald-600 dark:text-emerald-400" />
        ) : (
          <PiCopy size={13} aria-hidden="true" />
        )}
      </button>
      <span role="status" className="sr-only">
        {copied ? "Copied" : ""}
      </span>
    </span>
  )
}
