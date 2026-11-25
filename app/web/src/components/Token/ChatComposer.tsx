"use client"

import { type KeyboardEvent, useState } from "react"
import { PiPaperPlaneRight } from "react-icons/pi"

import { MAX_LENGTH } from "@/lib/chat/protocol"

import { CommentIcon } from "./CommentIcon"

export function ChatComposer({
  symbol,
  disabled,
  placeholder,
  onSend,
}: {
  symbol: string
  disabled?: boolean
  placeholder: string
  onSend: (text: string) => boolean
}) {
  const [draft, setDraft] = useState("")

  const send = () => {
    const text = draft.trim()
    if (text && onSend(text)) setDraft("")
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    send()
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-x-2">
        <CommentIcon />
        <div className="border-hover-border dark:border-border-tertiary bg-block-surface focus-within:border-primary focus-within:ring-primary flex flex-1 items-end gap-x-2 rounded-xl border-[1.5px] px-3 py-1.5 transition-shadow focus-within:ring-1">
          <label htmlFor="chat-message" className="sr-only">
            Message about {symbol}
          </label>
          <textarea
            id="chat-message"
            rows={1}
            value={draft}
            maxLength={MAX_LENGTH}
            disabled={disabled}
            placeholder={placeholder}
            onKeyDown={onKeyDown}
            onChange={(event) => setDraft(event.target.value)}
            onInput={({ currentTarget }) => {
              currentTarget.style.height = "auto"
              currentTarget.style.height = `${Math.min(currentTarget.scrollHeight, 96)}px`
            }}
            className="placeholder:text-ink-400 max-h-24 min-h-7 flex-1 resize-none self-center border-0 bg-transparent text-sm leading-5 outline-none disabled:cursor-not-allowed"
          />
          <button
            type="button"
            onClick={send}
            disabled={disabled || !draft.trim()}
            aria-label="Send message"
            className="bg-primary text-primary-foreground flex-none rounded-lg p-2 transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            <PiPaperPlaneRight size={16} />
          </button>
        </div>
      </div>
      {draft.length > MAX_LENGTH - 40 && (
        <span className="text-ink-400 self-end text-[11px] tabular-nums">
          {draft.length}/{MAX_LENGTH}
        </span>
      )}
    </div>
  )
}
