"use client"

import { type ReactNode, useEffect, useRef, useState } from "react"
import { PiCheck, PiCopy } from "react-icons/pi"

import { COPIED_MS, EXPLORER, NOUN } from "@/constants/components/address/address"
import { type AddressLength, formatAddress } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { AddressKind } from "@/types/ui"
const explorerUrl = (kind: AddressKind, value: string) => `${EXPLORER}/${kind}/${value}`

type AddressProps = {
  value: string
  kind?: AddressKind
  length?: AddressLength
  href?: string | null
  icon?: ReactNode
  className?: string
}

export function Address({ value, kind = "address", length = "short", href, icon, className }: AddressProps) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const link = href === undefined ? explorerUrl(kind, value) : href

  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
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
